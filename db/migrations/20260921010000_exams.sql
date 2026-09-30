-- migrate:up
-- slice-4: Tao de & Thi online.
-- `exams`: de/blueprint (Admin/Teacher tao) — rut ngau nhien tu ngan hang cau hoi theo Level + Skill.
-- `exam_attempts`: mot luot lam cua hoc vien; unique(exam_id, student_id) => nop 1 lan, vao lai resume de cu.
-- Additive (AGENTS.md muc 16): chi them bang moi, dao nguoc duoc.

create table if not exists exams (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  level_id uuid not null references levels(id),
  skill text not null check (skill in ('listening', 'speaking', 'reading', 'writing')),
  question_count integer not null check (question_count >= 1),
  duration_minutes integer not null check (duration_minutes >= 1),
  opens_at timestamptz not null,
  closes_at timestamptz not null,
  created_by uuid not null references users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (closes_at > opens_at)
);

create index if not exists exams_level_id_idx on exams(level_id);
create index if not exists exams_skill_idx on exams(skill);

create table if not exists exam_attempts (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references exams(id) on delete cascade,
  student_id uuid not null references users(id),
  -- De da sinh: chuoi JSON string[] cac question id (giu thu tu).
  question_ids text not null,
  -- Dap an hoc vien: chuoi JSON object; null cho toi khi nop.
  answers text,
  started_at timestamptz not null default now(),
  deadline_at timestamptz not null,
  submitted_at timestamptz,
  -- Moi hoc vien chi mot luot / de: nop 1 lan, vao lai khong lam lai duoc de cu.
  unique (exam_id, student_id)
);

create index if not exists exam_attempts_student_idx on exam_attempts(student_id);

-- migrate:down
drop table if exists exam_attempts;
drop table if exists exams;
