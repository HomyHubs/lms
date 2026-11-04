-- migrate:up
-- slice-5: auto grading, configurable pass threshold per level (copied onto each exam),
-- retakes with attempt limit + cooldown, and an audit history of every attempt.
-- See docs/adr/0003-exam-grading-retakes.md.

create table if not exists exam_grading_policies (
  level_id uuid primary key references levels(id) on delete cascade,
  pass_percent integer not null default 50 check (pass_percent between 0 and 100),
  max_attempts integer not null default 3 check (max_attempts between 1 and 20),
  retake_cooldown_minutes integer not null default 0 check (retake_cooldown_minutes between 0 and 43200),
  updated_at timestamptz not null default now()
);

insert into exam_grading_policies (level_id)
select id from levels
on conflict (level_id) do nothing;

alter table exams add column pass_percent integer not null default 50
  check (pass_percent between 0 and 100);
alter table exams add column max_attempts integer not null default 3
  check (max_attempts between 1 and 20);
alter table exams add column retake_cooldown_minutes integer not null default 0
  check (retake_cooldown_minutes between 0 and 43200);

-- Every pre-existing attempt is the first attempt of its exam.
alter table exam_attempts add column attempt_number integer not null default 1
  check (attempt_number >= 1);
alter table exam_attempts add column score integer check (score >= 0);
alter table exam_attempts add column max_score integer check (max_score >= 0);
alter table exam_attempts add column passed boolean;
alter table exam_attempts add column graded_at timestamptz;
-- Per-question audit record; never filtered on, so kept as one JSON text value.
alter table exam_attempts add column grading_detail text;

alter table exam_attempts drop constraint exam_attempts_exam_id_student_id_key;
alter table exam_attempts add constraint exam_attempts_exam_student_attempt_key
  unique (exam_id, student_id, attempt_number);

-- A recorded grade is part of the audit trail: once graded_at is set it cannot change.
create function protect_exam_grade() returns trigger language plpgsql as $$
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
  ) then
    raise exception 'Exam grade is immutable once recorded';
  end if;
  return new;
end;
$$;
create trigger exam_grade_immutable before update on exam_attempts
for each row execute function protect_exam_grade();

-- migrate:down
-- Rolling back removes retake attempts (attempt_number > 1): the old schema allows one attempt per exam.
drop trigger exam_grade_immutable on exam_attempts;
drop function protect_exam_grade();
delete from exam_attempts where attempt_number > 1;
alter table exam_attempts drop constraint exam_attempts_exam_student_attempt_key;
alter table exam_attempts add constraint exam_attempts_exam_id_student_id_key unique (exam_id, student_id);
alter table exam_attempts drop column grading_detail;
alter table exam_attempts drop column graded_at;
alter table exam_attempts drop column passed;
alter table exam_attempts drop column max_score;
alter table exam_attempts drop column score;
alter table exam_attempts drop column attempt_number;
alter table exams drop column retake_cooldown_minutes;
alter table exams drop column max_attempts;
alter table exams drop column pass_percent;
drop table if exists exam_grading_policies;
