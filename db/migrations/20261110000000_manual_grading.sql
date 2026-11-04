-- migrate:up
-- slice-9a: teachers grade Speaking/Writing attempts by hand. The grader and their feedback are
-- part of the immutable grade, like score/passed. See docs/adr/0009-manual-grading.md.

alter table exam_attempts add column graded_by uuid references users(id) on delete set null;
alter table exam_attempts add column grader_feedback text
  check (grader_feedback is null or length(grader_feedback) <= 2000);

create or replace function protect_exam_grade() returns trigger language plpgsql as $$
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

-- migrate:down
create or replace function protect_exam_grade() returns trigger language plpgsql as $$
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
alter table exam_attempts drop column grader_feedback;
alter table exam_attempts drop column graded_by;
