\restrict dbmate

-- Dumped from database version 18.6
-- Dumped by pg_dump version 18.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- Name: protect_exam_grade(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.protect_exam_grade() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  if new.attempt_number is distinct from old.attempt_number then
    raise exception 'Exam attempt number is immutable';
  end if;
  if old.graded_at is not null and (
    new.graded_at is distinct from old.graded_at
    or new.score is distinct from old.score
    or new.max_score is distinct from old.max_score
    or new.passed is distinct from old.passed
    or new.grading_detail is distinct from old.grading_detail
    or new.grader_feedback is distinct from old.grader_feedback
    -- ON DELETE SET NULL of the grader account stays allowed.
    or (new.graded_by is distinct from old.graded_by and new.graded_by is not null)
  ) then
    raise exception 'Exam grade is immutable once recorded';
  end if;
  return new;
end;
$$;


--
-- Name: protect_exam_set(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.protect_exam_set() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  if tg_op = 'DELETE' then
    if old.status <> 'draft' then
      raise exception 'Exam set % is not a draft and cannot be deleted', old.id using errcode = 'restrict_violation';
    end if;
    return old;
  end if;
  if old.status <> 'draft' and (
    new.title is distinct from old.title
    or new.description is distinct from old.description
    or new.level_id is distinct from old.level_id
    or new.skill is distinct from old.skill
    or new.published_at is distinct from old.published_at
    or not (new.status = old.status or (old.status = 'published' and new.status = 'archived'))
  ) then
    raise exception 'Published exam set % is immutable', old.id using errcode = 'restrict_violation';
  end if;
  return new;
end;
$$;


--
-- Name: protect_exam_set_items(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.protect_exam_set_items() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
declare
  set_status text;
begin
  select status into set_status from exam_sets
    where id = case when tg_op = 'DELETE' then old.exam_set_id else new.exam_set_id end;
  -- Cascade deletes of a draft set see no parent row anymore.
  if set_status is not null and set_status <> 'draft' then
    raise exception 'Items of a published exam set are immutable' using errcode = 'restrict_violation';
  end if;
  if tg_op = 'UPDATE' and new.exam_set_id is distinct from old.exam_set_id then
    raise exception 'Exam set items cannot move between sets' using errcode = 'restrict_violation';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;


--
-- Name: protect_exam_snapshot(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.protect_exam_snapshot() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  if new.question_snapshot is distinct from old.question_snapshot
     or new.question_ids is distinct from old.question_ids
     or new.started_at is distinct from old.started_at
     or new.deadline_at is distinct from old.deadline_at
     or (old.session_key is not null and new.session_key is distinct from old.session_key)
  then raise exception 'Exam identity and snapshot are immutable'; end if;
  return new;
end;
$$;


--
-- Name: protect_question_media(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.protect_question_media() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
declare
  question_ids uuid[] := '{}';
begin
  if tg_op <> 'INSERT' then question_ids := question_ids || old.question_id; end if;
  if tg_op <> 'DELETE' then question_ids := question_ids || new.question_id; end if;
  if exists (
    select 1 from exam_set_items i join exam_sets s on s.id = i.exam_set_id
    where i.question_id = any(question_ids) and s.status <> 'draft'
  ) then
    raise exception 'Images of a question in a published exam set are immutable' using errcode = 'restrict_violation';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;


--
-- Name: protect_set_question(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.protect_set_question() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  if (
    new.question_text is distinct from old.question_text
    or new.options is distinct from old.options
    or new.correct_answer is distinct from old.correct_answer
    or new.points is distinct from old.points
    or new.question_type is distinct from old.question_type
    or new.level_id is distinct from old.level_id
    or new.skill is distinct from old.skill
  ) and exists (
    select 1 from exam_set_items i join exam_sets s on s.id = i.exam_set_id
    where i.question_id = old.id and s.status <> 'draft'
  ) then
    raise exception 'Question % belongs to a published exam set', old.id using errcode = 'restrict_violation';
  end if;
  return new;
end;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: ai_generated_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_generated_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    request_id uuid NOT NULL,
    "position" integer NOT NULL,
    payload text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    question_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ai_generated_items_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text, 'saved'::text])))
);


--
-- Name: ai_generation_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_generation_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created_by uuid NOT NULL,
    level_id uuid NOT NULL,
    skill text NOT NULL,
    question_type text,
    difficulty text,
    question_count integer NOT NULL,
    sample_question_ids text DEFAULT '[]'::text NOT NULL,
    prompt text NOT NULL,
    status text DEFAULT 'draft'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ai_generation_requests_difficulty_check CHECK ((difficulty = ANY (ARRAY['easy'::text, 'medium'::text, 'hard'::text]))),
    CONSTRAINT ai_generation_requests_question_count_check CHECK (((question_count >= 1) AND (question_count <= 50))),
    CONSTRAINT ai_generation_requests_question_type_check CHECK ((question_type = ANY (ARRAY['multiple_choice'::text, 'fill_blank'::text, 'matching'::text, 'true_false'::text]))),
    CONSTRAINT ai_generation_requests_skill_check CHECK ((skill = ANY (ARRAY['listening'::text, 'speaking'::text, 'reading'::text, 'writing'::text]))),
    CONSTRAINT ai_generation_requests_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'imported'::text, 'reviewed'::text, 'saved_to_bank'::text])))
);


--
-- Name: app_meta; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.app_meta (
    key text NOT NULL,
    value text NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: attendance_records; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.attendance_records (
    session_id uuid NOT NULL,
    student_id uuid NOT NULL,
    status text NOT NULL,
    note text,
    recorded_by uuid NOT NULL,
    recorded_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT attendance_records_status_check CHECK ((status = ANY (ARRAY['present'::text, 'absent'::text, 'late'::text, 'excused'::text])))
);


--
-- Name: branches; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.branches (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    center_id uuid NOT NULL,
    name text NOT NULL,
    address text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: centers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.centers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: class_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.class_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    class_id uuid NOT NULL,
    session_date date NOT NULL,
    starts_at time without time zone DEFAULT '00:00:00'::time without time zone NOT NULL,
    topic text,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    duration_minutes integer DEFAULT 90 NOT NULL,
    planned_teacher_id uuid,
    makeup_for_session_id uuid,
    cancelled_at timestamp with time zone,
    CONSTRAINT class_sessions_duration_minutes_check CHECK (((duration_minutes >= 15) AND (duration_minutes <= 480)))
);


--
-- Name: class_teachers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.class_teachers (
    class_id uuid NOT NULL,
    teacher_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: classes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.classes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    course_id uuid NOT NULL,
    branch_id uuid NOT NULL,
    name text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: courses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.courses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    level_id uuid NOT NULL,
    name text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: enrollments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.enrollments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    class_id uuid NOT NULL,
    student_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: exam_attempt_media; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.exam_attempt_media (
    attempt_id uuid NOT NULL,
    media_id uuid NOT NULL
);


--
-- Name: exam_attempts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.exam_attempts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    exam_id uuid NOT NULL,
    student_id uuid NOT NULL,
    question_ids text NOT NULL,
    answers text,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    deadline_at timestamp with time zone NOT NULL,
    submitted_at timestamp with time zone,
    question_snapshot text,
    session_key text,
    answer_revision integer DEFAULT 0 NOT NULL,
    attempt_number integer DEFAULT 1 NOT NULL,
    score integer,
    max_score integer,
    passed boolean,
    graded_at timestamp with time zone,
    grading_detail text,
    graded_by uuid,
    grader_feedback text,
    exam_set_id uuid,
    submit_reason text,
    CONSTRAINT exam_attempts_answer_revision_check CHECK ((answer_revision >= 0)),
    CONSTRAINT exam_attempts_attempt_number_check CHECK ((attempt_number >= 1)),
    CONSTRAINT exam_attempts_grader_feedback_check CHECK (((grader_feedback IS NULL) OR (length(grader_feedback) <= 2000))),
    CONSTRAINT exam_attempts_max_score_check CHECK ((max_score >= 0)),
    CONSTRAINT exam_attempts_score_check CHECK ((score >= 0)),
    CONSTRAINT exam_attempts_submit_reason_check CHECK ((submit_reason = ANY (ARRAY['manual'::text, 'deadline_auto'::text])))
);


--
-- Name: exam_classes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.exam_classes (
    exam_id uuid NOT NULL,
    class_id uuid NOT NULL
);


--
-- Name: exam_grading_policies; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.exam_grading_policies (
    level_id uuid NOT NULL,
    pass_percent integer DEFAULT 50 NOT NULL,
    max_attempts integer DEFAULT 3 NOT NULL,
    retake_cooldown_minutes integer DEFAULT 0 NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT exam_grading_policies_max_attempts_check CHECK (((max_attempts >= 1) AND (max_attempts <= 20))),
    CONSTRAINT exam_grading_policies_pass_percent_check CHECK (((pass_percent >= 0) AND (pass_percent <= 100))),
    CONSTRAINT exam_grading_policies_retake_cooldown_minutes_check CHECK (((retake_cooldown_minutes >= 0) AND (retake_cooldown_minutes <= 43200)))
);


--
-- Name: exam_set_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.exam_set_items (
    exam_set_id uuid NOT NULL,
    "position" integer NOT NULL,
    question_id uuid NOT NULL,
    CONSTRAINT exam_set_items_position_check CHECK (("position" >= 1))
);


--
-- Name: exam_set_links; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.exam_set_links (
    exam_id uuid NOT NULL,
    exam_set_id uuid NOT NULL,
    "position" integer NOT NULL,
    CONSTRAINT exam_set_links_position_check CHECK (("position" >= 1))
);


--
-- Name: exam_sets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.exam_sets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    level_id uuid NOT NULL,
    skill text NOT NULL,
    description text,
    status text DEFAULT 'draft'::text NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    published_at timestamp with time zone,
    CONSTRAINT exam_sets_check CHECK (((status = 'draft'::text) = (published_at IS NULL))),
    CONSTRAINT exam_sets_description_check CHECK (((description IS NULL) OR (length(description) <= 2000))),
    CONSTRAINT exam_sets_skill_check CHECK ((skill = ANY (ARRAY['listening'::text, 'speaking'::text, 'reading'::text, 'writing'::text]))),
    CONSTRAINT exam_sets_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'published'::text, 'archived'::text]))),
    CONSTRAINT exam_sets_title_check CHECK (((length(title) >= 1) AND (length(title) <= 200)))
);


--
-- Name: exams; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.exams (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    level_id uuid NOT NULL,
    skill text NOT NULL,
    question_count integer NOT NULL,
    duration_minutes integer NOT NULL,
    opens_at timestamp with time zone NOT NULL,
    closes_at timestamp with time zone NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    pass_percent integer DEFAULT 50 NOT NULL,
    max_attempts integer DEFAULT 3 NOT NULL,
    retake_cooldown_minutes integer DEFAULT 0 NOT NULL,
    mode text DEFAULT 'random'::text NOT NULL,
    exam_set_id uuid,
    shuffle_questions boolean DEFAULT false NOT NULL,
    shuffle_options boolean DEFAULT false NOT NULL,
    retake_strategy text DEFAULT 'same_set_shuffled'::text NOT NULL,
    CONSTRAINT exams_check CHECK ((closes_at > opens_at)),
    CONSTRAINT exams_duration_minutes_check CHECK ((duration_minutes >= 1)),
    CONSTRAINT exams_max_attempts_check CHECK (((max_attempts >= 1) AND (max_attempts <= 20))),
    CONSTRAINT exams_mode_check CHECK ((mode = ANY (ARRAY['random'::text, 'fixed_set'::text]))),
    CONSTRAINT exams_mode_set_check CHECK (((mode = 'fixed_set'::text) = (exam_set_id IS NOT NULL))),
    CONSTRAINT exams_pass_percent_check CHECK (((pass_percent >= 0) AND (pass_percent <= 100))),
    CONSTRAINT exams_question_count_check CHECK ((question_count >= 1)),
    CONSTRAINT exams_retake_cooldown_minutes_check CHECK (((retake_cooldown_minutes >= 0) AND (retake_cooldown_minutes <= 43200))),
    CONSTRAINT exams_retake_strategy_check CHECK ((retake_strategy = ANY (ARRAY['same_set_shuffled'::text, 'alternate_sets'::text]))),
    CONSTRAINT exams_skill_check CHECK ((skill = ANY (ARRAY['listening'::text, 'speaking'::text, 'reading'::text, 'writing'::text])))
);


--
-- Name: levels; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.levels (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    name text NOT NULL
);


--
-- Name: media_assets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.media_assets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    sha256 text NOT NULL,
    mime text NOT NULL,
    bytes integer NOT NULL,
    width integer NOT NULL,
    height integer NOT NULL,
    storage_key text NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT media_assets_bytes_check CHECK (((bytes >= 1) AND (bytes <= 2097152))),
    CONSTRAINT media_assets_height_check CHECK (((height >= 1) AND (height <= 4000))),
    CONSTRAINT media_assets_mime_check CHECK ((mime = ANY (ARRAY['image/png'::text, 'image/jpeg'::text, 'image/webp'::text, 'image/gif'::text]))),
    CONSTRAINT media_assets_sha256_check CHECK ((sha256 ~ '^[0-9a-f]{64}$'::text)),
    CONSTRAINT media_assets_width_check CHECK (((width >= 1) AND (width <= 4000)))
);


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    kind text NOT NULL,
    title text NOT NULL,
    body text NOT NULL,
    dedupe_key text NOT NULL,
    channel text NOT NULL,
    delivery_status text DEFAULT 'pending'::text NOT NULL,
    delivery_attempts integer DEFAULT 0 NOT NULL,
    last_error text,
    sent_at timestamp with time zone,
    read_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT notifications_channel_check CHECK ((channel = ANY (ARRAY['console'::text, 'whatsapp'::text, 'telegram'::text]))),
    CONSTRAINT notifications_delivery_attempts_check CHECK ((delivery_attempts >= 0)),
    CONSTRAINT notifications_delivery_status_check CHECK ((delivery_status = ANY (ARRAY['pending'::text, 'sent'::text, 'failed'::text]))),
    CONSTRAINT notifications_kind_check CHECK ((kind = ANY (ARRAY['retake_reminder'::text, 'session_reminder'::text])))
);


--
-- Name: password_reset_otps; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.password_reset_otps (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    otp_hash text NOT NULL,
    attempts integer DEFAULT 0 NOT NULL,
    consumed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    channel character varying(20) DEFAULT 'email'::character varying NOT NULL
);


--
-- Name: question_edit_permissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.question_edit_permissions (
    role text NOT NULL,
    can_edit boolean NOT NULL
);


--
-- Name: question_media; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.question_media (
    question_id uuid NOT NULL,
    "position" integer NOT NULL,
    media_id uuid NOT NULL,
    slot text NOT NULL,
    option_index integer,
    CONSTRAINT question_media_check CHECK (((slot = 'option'::text) = (option_index IS NOT NULL))),
    CONSTRAINT question_media_option_index_check CHECK (((option_index >= 0) AND (option_index <= 25))),
    CONSTRAINT question_media_position_check CHECK (("position" >= 1)),
    CONSTRAINT question_media_slot_check CHECK ((slot = ANY (ARRAY['stem'::text, 'option'::text])))
);


--
-- Name: questions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.questions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    level_id uuid NOT NULL,
    skill text NOT NULL,
    question_type text NOT NULL,
    difficulty text NOT NULL,
    question_text text NOT NULL,
    options text,
    correct_answer text NOT NULL,
    points integer DEFAULT 1 NOT NULL,
    explanation text,
    source_reference text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    source text DEFAULT 'manual'::text NOT NULL,
    CONSTRAINT questions_difficulty_check CHECK ((difficulty = ANY (ARRAY['easy'::text, 'medium'::text, 'hard'::text]))),
    CONSTRAINT questions_question_type_check CHECK ((question_type = ANY (ARRAY['multiple_choice'::text, 'fill_blank'::text, 'matching'::text, 'true_false'::text]))),
    CONSTRAINT questions_skill_check CHECK ((skill = ANY (ARRAY['listening'::text, 'speaking'::text, 'reading'::text, 'writing'::text]))),
    CONSTRAINT questions_source_check CHECK ((source = ANY (ARRAY['manual'::text, 'ai_generated'::text, 'exam_set'::text])))
);


--
-- Name: schema_migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.schema_migrations (
    version character varying NOT NULL
);


--
-- Name: sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sessions (
    token_hash text NOT NULL,
    user_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone NOT NULL
);


--
-- Name: staff_shifts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.staff_shifts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    check_in_at timestamp with time zone DEFAULT now() NOT NULL,
    check_out_at timestamp with time zone,
    CONSTRAINT staff_shifts_check CHECK (((check_out_at IS NULL) OR (check_out_at > check_in_at)))
);


--
-- Name: student_grading_policies; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.student_grading_policies (
    level_id uuid NOT NULL,
    exam_weight integer DEFAULT 90 NOT NULL,
    attendance_weight integer DEFAULT 10 NOT NULL,
    excellent_min integer DEFAULT 85 NOT NULL,
    good_min integer DEFAULT 70 NOT NULL,
    average_min integer DEFAULT 50 NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    pass_min integer DEFAULT 50 NOT NULL,
    CONSTRAINT student_grading_policies_attendance_weight_check CHECK (((attendance_weight >= 0) AND (attendance_weight <= 100))),
    CONSTRAINT student_grading_policies_average_min_check CHECK (((average_min >= 0) AND (average_min <= 100))),
    CONSTRAINT student_grading_policies_check CHECK (((exam_weight + attendance_weight) = 100)),
    CONSTRAINT student_grading_policies_check1 CHECK (((excellent_min >= good_min) AND (good_min >= average_min))),
    CONSTRAINT student_grading_policies_exam_weight_check CHECK (((exam_weight >= 0) AND (exam_weight <= 100))),
    CONSTRAINT student_grading_policies_excellent_min_check CHECK (((excellent_min >= 0) AND (excellent_min <= 100))),
    CONSTRAINT student_grading_policies_good_min_check CHECK (((good_min >= 0) AND (good_min <= 100))),
    CONSTRAINT student_grading_policies_pass_min_check CHECK (((pass_min >= 0) AND (pass_min <= 100)))
);


--
-- Name: user_branches; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_branches (
    user_id uuid NOT NULL,
    branch_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    phone_number text NOT NULL,
    password_hash text NOT NULL,
    role text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    email text,
    last_name text,
    first_name text,
    birth_year integer,
    gender text,
    address text,
    parent_phone text,
    CONSTRAINT users_gender_check CHECK ((gender = ANY (ARRAY['male'::text, 'female'::text, 'other'::text]))),
    CONSTRAINT users_role_check CHECK ((role = ANY (ARRAY['superadmin'::text, 'admin'::text, 'teacher'::text, 'student'::text, 'staff'::text])))
);


--
-- Name: ai_generated_items ai_generated_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_generated_items
    ADD CONSTRAINT ai_generated_items_pkey PRIMARY KEY (id);


--
-- Name: ai_generated_items ai_generated_items_request_id_position_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_generated_items
    ADD CONSTRAINT ai_generated_items_request_id_position_key UNIQUE (request_id, "position");


--
-- Name: ai_generation_requests ai_generation_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_generation_requests
    ADD CONSTRAINT ai_generation_requests_pkey PRIMARY KEY (id);


--
-- Name: app_meta app_meta_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_meta
    ADD CONSTRAINT app_meta_pkey PRIMARY KEY (key);


--
-- Name: attendance_records attendance_records_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance_records
    ADD CONSTRAINT attendance_records_pkey PRIMARY KEY (session_id, student_id);


--
-- Name: branches branches_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.branches
    ADD CONSTRAINT branches_pkey PRIMARY KEY (id);


--
-- Name: centers centers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.centers
    ADD CONSTRAINT centers_pkey PRIMARY KEY (id);


--
-- Name: class_sessions class_sessions_class_id_session_date_starts_at_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.class_sessions
    ADD CONSTRAINT class_sessions_class_id_session_date_starts_at_key UNIQUE (class_id, session_date, starts_at);


--
-- Name: class_sessions class_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.class_sessions
    ADD CONSTRAINT class_sessions_pkey PRIMARY KEY (id);


--
-- Name: class_teachers class_teachers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.class_teachers
    ADD CONSTRAINT class_teachers_pkey PRIMARY KEY (class_id, teacher_id);


--
-- Name: classes classes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.classes
    ADD CONSTRAINT classes_pkey PRIMARY KEY (id);


--
-- Name: courses courses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.courses
    ADD CONSTRAINT courses_pkey PRIMARY KEY (id);


--
-- Name: enrollments enrollments_class_id_student_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.enrollments
    ADD CONSTRAINT enrollments_class_id_student_id_key UNIQUE (class_id, student_id);


--
-- Name: enrollments enrollments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.enrollments
    ADD CONSTRAINT enrollments_pkey PRIMARY KEY (id);


--
-- Name: exam_attempt_media exam_attempt_media_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exam_attempt_media
    ADD CONSTRAINT exam_attempt_media_pkey PRIMARY KEY (attempt_id, media_id);


--
-- Name: exam_attempts exam_attempts_exam_student_attempt_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exam_attempts
    ADD CONSTRAINT exam_attempts_exam_student_attempt_key UNIQUE (exam_id, student_id, attempt_number);


--
-- Name: exam_attempts exam_attempts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exam_attempts
    ADD CONSTRAINT exam_attempts_pkey PRIMARY KEY (id);


--
-- Name: exam_classes exam_classes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exam_classes
    ADD CONSTRAINT exam_classes_pkey PRIMARY KEY (exam_id, class_id);


--
-- Name: exam_grading_policies exam_grading_policies_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exam_grading_policies
    ADD CONSTRAINT exam_grading_policies_pkey PRIMARY KEY (level_id);


--
-- Name: exam_set_items exam_set_items_exam_set_id_question_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exam_set_items
    ADD CONSTRAINT exam_set_items_exam_set_id_question_id_key UNIQUE (exam_set_id, question_id);


--
-- Name: exam_set_items exam_set_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exam_set_items
    ADD CONSTRAINT exam_set_items_pkey PRIMARY KEY (exam_set_id, "position");


--
-- Name: exam_set_links exam_set_links_exam_id_exam_set_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exam_set_links
    ADD CONSTRAINT exam_set_links_exam_id_exam_set_id_key UNIQUE (exam_id, exam_set_id);


--
-- Name: exam_set_links exam_set_links_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exam_set_links
    ADD CONSTRAINT exam_set_links_pkey PRIMARY KEY (exam_id, "position");


--
-- Name: exam_sets exam_sets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exam_sets
    ADD CONSTRAINT exam_sets_pkey PRIMARY KEY (id);


--
-- Name: exams exams_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exams
    ADD CONSTRAINT exams_pkey PRIMARY KEY (id);


--
-- Name: levels levels_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.levels
    ADD CONSTRAINT levels_code_key UNIQUE (code);


--
-- Name: levels levels_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.levels
    ADD CONSTRAINT levels_pkey PRIMARY KEY (id);


--
-- Name: media_assets media_assets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.media_assets
    ADD CONSTRAINT media_assets_pkey PRIMARY KEY (id);


--
-- Name: media_assets media_assets_sha256_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.media_assets
    ADD CONSTRAINT media_assets_sha256_key UNIQUE (sha256);


--
-- Name: notifications notifications_dedupe_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_dedupe_key_key UNIQUE (dedupe_key);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: password_reset_otps password_reset_otps_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.password_reset_otps
    ADD CONSTRAINT password_reset_otps_pkey PRIMARY KEY (id);


--
-- Name: question_edit_permissions question_edit_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.question_edit_permissions
    ADD CONSTRAINT question_edit_permissions_pkey PRIMARY KEY (role);


--
-- Name: question_media question_media_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.question_media
    ADD CONSTRAINT question_media_pkey PRIMARY KEY (question_id, "position");


--
-- Name: questions questions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.questions
    ADD CONSTRAINT questions_pkey PRIMARY KEY (id);


--
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (version);


--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (token_hash);


--
-- Name: staff_shifts staff_shifts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_shifts
    ADD CONSTRAINT staff_shifts_pkey PRIMARY KEY (id);


--
-- Name: student_grading_policies student_grading_policies_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_grading_policies
    ADD CONSTRAINT student_grading_policies_pkey PRIMARY KEY (level_id);


--
-- Name: user_branches user_branches_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_branches
    ADD CONSTRAINT user_branches_pkey PRIMARY KEY (user_id, branch_id);


--
-- Name: users users_phone_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_phone_number_key UNIQUE (phone_number);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: ai_generation_requests_created_by_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ai_generation_requests_created_by_idx ON public.ai_generation_requests USING btree (created_by);


--
-- Name: attendance_records_student_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX attendance_records_student_id_idx ON public.attendance_records USING btree (student_id);


--
-- Name: branches_center_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX branches_center_id_idx ON public.branches USING btree (center_id);


--
-- Name: class_sessions_class_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX class_sessions_class_date_idx ON public.class_sessions USING btree (class_id, session_date);


--
-- Name: class_sessions_session_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX class_sessions_session_date_idx ON public.class_sessions USING btree (session_date);


--
-- Name: class_teachers_teacher_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX class_teachers_teacher_id_idx ON public.class_teachers USING btree (teacher_id);


--
-- Name: classes_branch_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX classes_branch_id_idx ON public.classes USING btree (branch_id);


--
-- Name: classes_course_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX classes_course_id_idx ON public.classes USING btree (course_id);


--
-- Name: courses_level_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX courses_level_id_idx ON public.courses USING btree (level_id);


--
-- Name: enrollments_class_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX enrollments_class_id_idx ON public.enrollments USING btree (class_id);


--
-- Name: enrollments_student_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX enrollments_student_id_idx ON public.enrollments USING btree (student_id);


--
-- Name: exam_attempt_media_media_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX exam_attempt_media_media_idx ON public.exam_attempt_media USING btree (media_id);


--
-- Name: exam_attempts_student_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX exam_attempts_student_idx ON public.exam_attempts USING btree (student_id);


--
-- Name: exam_attempts_student_started_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX exam_attempts_student_started_idx ON public.exam_attempts USING btree (student_id, started_at DESC, id DESC);


--
-- Name: exam_classes_class_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX exam_classes_class_idx ON public.exam_classes USING btree (class_id);


--
-- Name: exam_set_items_question_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX exam_set_items_question_idx ON public.exam_set_items USING btree (question_id);


--
-- Name: exam_sets_level_skill_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX exam_sets_level_skill_idx ON public.exam_sets USING btree (level_id, skill, status);


--
-- Name: exams_level_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX exams_level_id_idx ON public.exams USING btree (level_id);


--
-- Name: exams_skill_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX exams_skill_idx ON public.exams USING btree (skill);


--
-- Name: notifications_pending_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX notifications_pending_idx ON public.notifications USING btree (created_at) WHERE (delivery_status = 'pending'::text);


--
-- Name: notifications_user_created_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX notifications_user_created_idx ON public.notifications USING btree (user_id, created_at DESC);


--
-- Name: password_reset_otps_expires_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX password_reset_otps_expires_at_idx ON public.password_reset_otps USING btree (expires_at);


--
-- Name: password_reset_otps_user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX password_reset_otps_user_id_idx ON public.password_reset_otps USING btree (user_id);


--
-- Name: question_media_media_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX question_media_media_idx ON public.question_media USING btree (media_id);


--
-- Name: question_media_option_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX question_media_option_key ON public.question_media USING btree (question_id, option_index) WHERE (slot = 'option'::text);


--
-- Name: questions_difficulty_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX questions_difficulty_idx ON public.questions USING btree (difficulty);


--
-- Name: questions_level_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX questions_level_id_idx ON public.questions USING btree (level_id);


--
-- Name: questions_skill_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX questions_skill_idx ON public.questions USING btree (skill);


--
-- Name: sessions_expires_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sessions_expires_at_idx ON public.sessions USING btree (expires_at);


--
-- Name: sessions_user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sessions_user_id_idx ON public.sessions USING btree (user_id);


--
-- Name: staff_shifts_one_open_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX staff_shifts_one_open_idx ON public.staff_shifts USING btree (user_id) WHERE (check_out_at IS NULL);


--
-- Name: staff_shifts_user_check_in_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX staff_shifts_user_check_in_idx ON public.staff_shifts USING btree (user_id, check_in_at);


--
-- Name: user_branches_branch_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX user_branches_branch_id_idx ON public.user_branches USING btree (branch_id);


--
-- Name: user_branches_user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX user_branches_user_id_idx ON public.user_branches USING btree (user_id);


--
-- Name: users_email_unique_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX users_email_unique_idx ON public.users USING btree (email) WHERE (email IS NOT NULL);


--
-- Name: exam_attempts exam_grade_immutable; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER exam_grade_immutable BEFORE UPDATE ON public.exam_attempts FOR EACH ROW EXECUTE FUNCTION public.protect_exam_grade();


--
-- Name: exam_sets exam_set_immutable; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER exam_set_immutable BEFORE DELETE OR UPDATE ON public.exam_sets FOR EACH ROW EXECUTE FUNCTION public.protect_exam_set();


--
-- Name: exam_set_items exam_set_items_immutable; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER exam_set_items_immutable BEFORE INSERT OR DELETE OR UPDATE ON public.exam_set_items FOR EACH ROW EXECUTE FUNCTION public.protect_exam_set_items();


--
-- Name: exam_attempts exam_snapshot_immutable; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER exam_snapshot_immutable BEFORE UPDATE ON public.exam_attempts FOR EACH ROW EXECUTE FUNCTION public.protect_exam_snapshot();


--
-- Name: questions question_in_published_set; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER question_in_published_set BEFORE UPDATE ON public.questions FOR EACH ROW EXECUTE FUNCTION public.protect_set_question();


--
-- Name: question_media question_media_immutable; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER question_media_immutable BEFORE INSERT OR DELETE OR UPDATE ON public.question_media FOR EACH ROW EXECUTE FUNCTION public.protect_question_media();


--
-- Name: ai_generated_items ai_generated_items_question_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_generated_items
    ADD CONSTRAINT ai_generated_items_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.questions(id) ON DELETE SET NULL;


--
-- Name: ai_generated_items ai_generated_items_request_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_generated_items
    ADD CONSTRAINT ai_generated_items_request_id_fkey FOREIGN KEY (request_id) REFERENCES public.ai_generation_requests(id) ON DELETE CASCADE;


--
-- Name: ai_generation_requests ai_generation_requests_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_generation_requests
    ADD CONSTRAINT ai_generation_requests_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: ai_generation_requests ai_generation_requests_level_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_generation_requests
    ADD CONSTRAINT ai_generation_requests_level_id_fkey FOREIGN KEY (level_id) REFERENCES public.levels(id);


--
-- Name: attendance_records attendance_records_recorded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance_records
    ADD CONSTRAINT attendance_records_recorded_by_fkey FOREIGN KEY (recorded_by) REFERENCES public.users(id);


--
-- Name: attendance_records attendance_records_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance_records
    ADD CONSTRAINT attendance_records_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.class_sessions(id) ON DELETE CASCADE;


--
-- Name: attendance_records attendance_records_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance_records
    ADD CONSTRAINT attendance_records_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: branches branches_center_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.branches
    ADD CONSTRAINT branches_center_id_fkey FOREIGN KEY (center_id) REFERENCES public.centers(id) ON DELETE CASCADE;


--
-- Name: class_sessions class_sessions_class_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.class_sessions
    ADD CONSTRAINT class_sessions_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id) ON DELETE CASCADE;


--
-- Name: class_sessions class_sessions_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.class_sessions
    ADD CONSTRAINT class_sessions_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: class_sessions class_sessions_makeup_for_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.class_sessions
    ADD CONSTRAINT class_sessions_makeup_for_session_id_fkey FOREIGN KEY (makeup_for_session_id) REFERENCES public.class_sessions(id) ON DELETE SET NULL;


--
-- Name: class_sessions class_sessions_planned_teacher_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.class_sessions
    ADD CONSTRAINT class_sessions_planned_teacher_id_fkey FOREIGN KEY (planned_teacher_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: class_teachers class_teachers_class_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.class_teachers
    ADD CONSTRAINT class_teachers_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id) ON DELETE CASCADE;


--
-- Name: class_teachers class_teachers_teacher_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.class_teachers
    ADD CONSTRAINT class_teachers_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: classes classes_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.classes
    ADD CONSTRAINT classes_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE CASCADE;


--
-- Name: classes classes_course_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.classes
    ADD CONSTRAINT classes_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE;


--
-- Name: courses courses_level_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.courses
    ADD CONSTRAINT courses_level_id_fkey FOREIGN KEY (level_id) REFERENCES public.levels(id);


--
-- Name: enrollments enrollments_class_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.enrollments
    ADD CONSTRAINT enrollments_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id) ON DELETE CASCADE;


--
-- Name: enrollments enrollments_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.enrollments
    ADD CONSTRAINT enrollments_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: exam_attempt_media exam_attempt_media_attempt_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exam_attempt_media
    ADD CONSTRAINT exam_attempt_media_attempt_id_fkey FOREIGN KEY (attempt_id) REFERENCES public.exam_attempts(id) ON DELETE CASCADE;


--
-- Name: exam_attempt_media exam_attempt_media_media_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exam_attempt_media
    ADD CONSTRAINT exam_attempt_media_media_id_fkey FOREIGN KEY (media_id) REFERENCES public.media_assets(id) ON DELETE RESTRICT;


--
-- Name: exam_attempts exam_attempts_exam_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exam_attempts
    ADD CONSTRAINT exam_attempts_exam_id_fkey FOREIGN KEY (exam_id) REFERENCES public.exams(id) ON DELETE RESTRICT;


--
-- Name: exam_attempts exam_attempts_exam_set_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exam_attempts
    ADD CONSTRAINT exam_attempts_exam_set_id_fkey FOREIGN KEY (exam_set_id) REFERENCES public.exam_sets(id) ON DELETE RESTRICT;


--
-- Name: exam_attempts exam_attempts_graded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exam_attempts
    ADD CONSTRAINT exam_attempts_graded_by_fkey FOREIGN KEY (graded_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: exam_attempts exam_attempts_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exam_attempts
    ADD CONSTRAINT exam_attempts_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.users(id);


--
-- Name: exam_classes exam_classes_class_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exam_classes
    ADD CONSTRAINT exam_classes_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id) ON DELETE CASCADE;


--
-- Name: exam_classes exam_classes_exam_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exam_classes
    ADD CONSTRAINT exam_classes_exam_id_fkey FOREIGN KEY (exam_id) REFERENCES public.exams(id) ON DELETE CASCADE;


--
-- Name: exam_grading_policies exam_grading_policies_level_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exam_grading_policies
    ADD CONSTRAINT exam_grading_policies_level_id_fkey FOREIGN KEY (level_id) REFERENCES public.levels(id) ON DELETE CASCADE;


--
-- Name: exam_set_items exam_set_items_exam_set_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exam_set_items
    ADD CONSTRAINT exam_set_items_exam_set_id_fkey FOREIGN KEY (exam_set_id) REFERENCES public.exam_sets(id) ON DELETE CASCADE;


--
-- Name: exam_set_items exam_set_items_question_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exam_set_items
    ADD CONSTRAINT exam_set_items_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.questions(id) ON DELETE RESTRICT;


--
-- Name: exam_set_links exam_set_links_exam_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exam_set_links
    ADD CONSTRAINT exam_set_links_exam_id_fkey FOREIGN KEY (exam_id) REFERENCES public.exams(id) ON DELETE CASCADE;


--
-- Name: exam_set_links exam_set_links_exam_set_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exam_set_links
    ADD CONSTRAINT exam_set_links_exam_set_id_fkey FOREIGN KEY (exam_set_id) REFERENCES public.exam_sets(id) ON DELETE RESTRICT;


--
-- Name: exam_sets exam_sets_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exam_sets
    ADD CONSTRAINT exam_sets_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: exam_sets exam_sets_level_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exam_sets
    ADD CONSTRAINT exam_sets_level_id_fkey FOREIGN KEY (level_id) REFERENCES public.levels(id);


--
-- Name: exams exams_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exams
    ADD CONSTRAINT exams_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: exams exams_exam_set_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exams
    ADD CONSTRAINT exams_exam_set_id_fkey FOREIGN KEY (exam_set_id) REFERENCES public.exam_sets(id) ON DELETE RESTRICT;


--
-- Name: exams exams_level_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exams
    ADD CONSTRAINT exams_level_id_fkey FOREIGN KEY (level_id) REFERENCES public.levels(id);


--
-- Name: media_assets media_assets_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.media_assets
    ADD CONSTRAINT media_assets_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: notifications notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: password_reset_otps password_reset_otps_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.password_reset_otps
    ADD CONSTRAINT password_reset_otps_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: question_media question_media_media_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.question_media
    ADD CONSTRAINT question_media_media_id_fkey FOREIGN KEY (media_id) REFERENCES public.media_assets(id) ON DELETE RESTRICT;


--
-- Name: question_media question_media_question_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.question_media
    ADD CONSTRAINT question_media_question_id_fkey FOREIGN KEY (question_id) REFERENCES public.questions(id) ON DELETE CASCADE;


--
-- Name: questions questions_level_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.questions
    ADD CONSTRAINT questions_level_id_fkey FOREIGN KEY (level_id) REFERENCES public.levels(id);


--
-- Name: sessions sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: staff_shifts staff_shifts_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_shifts
    ADD CONSTRAINT staff_shifts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: student_grading_policies student_grading_policies_level_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_grading_policies
    ADD CONSTRAINT student_grading_policies_level_id_fkey FOREIGN KEY (level_id) REFERENCES public.levels(id) ON DELETE CASCADE;


--
-- Name: user_branches user_branches_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_branches
    ADD CONSTRAINT user_branches_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE CASCADE;


--
-- Name: user_branches user_branches_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_branches
    ADD CONSTRAINT user_branches_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict dbmate


--
-- Dbmate schema migrations
--

INSERT INTO public.schema_migrations (version) VALUES
    ('20260914000000'),
    ('20260914010000'),
    ('20260914015000'),
    ('20260914020000'),
    ('20260916000000'),
    ('20260916010000'),
    ('20260916020000'),
    ('20260916030000'),
    ('20260920000000'),
    ('20260921000000'),
    ('20260921010000'),
    ('20261103000000'),
    ('20261104000000'),
    ('20261105000000'),
    ('20261106000000'),
    ('20261107000000'),
    ('20261108000000'),
    ('20261110000000'),
    ('20261111000000'),
    ('20261112000000'),
    ('20261113000000'),
    ('20261114000000'),
    ('20261115000000'),
    ('20261116000000'),
    ('20261117000000'),
    ('20261118000000'),
    ('20261119000000');
