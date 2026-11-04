-- migrate:up
-- slice-11a: fixed exam sets authored on the system + exams that use them (mode fixed_set).
-- A published set is immutable (items, content of its questions, metadata); only published ->
-- archived is allowed. See docs/adr/0011-fixed-exam-sets.md.

alter table questions drop constraint if exists questions_source_check;
alter table questions add constraint questions_source_check
  check (source in ('manual', 'ai_generated', 'exam_set'));

create table exam_sets (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(title) between 1 and 200),
  level_id uuid not null references levels(id),
  skill text not null check (skill in ('listening', 'speaking', 'reading', 'writing')),
  description text check (description is null or length(description) <= 2000),
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  created_by uuid not null references users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz,
  check ((status = 'draft') = (published_at is null))
);
create index exam_sets_level_skill_idx on exam_sets (level_id, skill, status);

create table exam_set_items (
  exam_set_id uuid not null references exam_sets(id) on delete cascade,
  position integer not null check (position >= 1),
  question_id uuid not null references questions(id) on delete restrict,
  primary key (exam_set_id, position),
  unique (exam_set_id, question_id)
);
create index exam_set_items_question_idx on exam_set_items (question_id);

alter table exams add column mode text not null default 'random' check (mode in ('random', 'fixed_set'));
alter table exams add column exam_set_id uuid references exam_sets(id) on delete restrict;
alter table exams add column shuffle_questions boolean not null default false;
alter table exams add column shuffle_options boolean not null default false;
alter table exams add column retake_strategy text not null default 'same_set_shuffled'
  check (retake_strategy in ('same_set_shuffled', 'alternate_sets'));
alter table exams add constraint exams_mode_set_check check ((mode = 'fixed_set') = (exam_set_id is not null));

-- Every set an exam may serve, in order; position 1 is exams.exam_set_id.
create table exam_set_links (
  exam_id uuid not null references exams(id) on delete cascade,
  exam_set_id uuid not null references exam_sets(id) on delete restrict,
  position integer not null check (position >= 1),
  primary key (exam_id, position),
  unique (exam_id, exam_set_id)
);

-- Which set served an attempt (null for random papers); fixed at insert like the snapshot.
alter table exam_attempts add column exam_set_id uuid references exam_sets(id) on delete restrict;

create function protect_exam_set() returns trigger language plpgsql as $$
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
create trigger exam_set_immutable before update or delete on exam_sets
for each row execute function protect_exam_set();

create function protect_exam_set_items() returns trigger language plpgsql as $$
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
create trigger exam_set_items_immutable before insert or update or delete on exam_set_items
for each row execute function protect_exam_set_items();

-- Bank edits must not change the content of a published set (draft sets follow the bank).
create function protect_set_question() returns trigger language plpgsql as $$
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
create trigger question_in_published_set before update on questions
for each row execute function protect_set_question();

-- migrate:down
drop trigger question_in_published_set on questions;
drop function protect_set_question();
alter table exam_attempts drop column exam_set_id;
drop table exam_set_links;
alter table exams drop constraint exams_mode_set_check;
alter table exams drop column retake_strategy;
alter table exams drop column shuffle_options;
alter table exams drop column shuffle_questions;
alter table exams drop column exam_set_id;
alter table exams drop column mode;
drop table exam_set_items;
drop table exam_sets;
drop function protect_exam_set_items();
drop function protect_exam_set();
update questions set source = 'manual' where source = 'exam_set';
alter table questions drop constraint questions_source_check;
alter table questions add constraint questions_source_check check (source in ('manual', 'ai_generated'));
