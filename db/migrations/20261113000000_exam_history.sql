-- migrate:up
-- slice-13: keep exam history (an exam with attempts can no longer be deleted), record why an
-- attempt was submitted, and index the per-student history. See docs/adr/0012-exam-history.md.

alter table exam_attempts drop constraint exam_attempts_exam_id_fkey;
alter table exam_attempts add constraint exam_attempts_exam_id_fkey
  foreign key (exam_id) references exams(id) on delete restrict;

alter table exam_attempts add column submit_reason text
  check (submit_reason in ('manual', 'deadline_auto'));

create index exam_attempts_student_started_idx on exam_attempts (student_id, started_at desc, id desc);

-- migrate:down
drop index if exists exam_attempts_student_started_idx;
alter table exam_attempts drop column if exists submit_reason;
alter table exam_attempts drop constraint exam_attempts_exam_id_fkey;
alter table exam_attempts add constraint exam_attempts_exam_id_fkey
  foreign key (exam_id) references exams(id) on delete cascade;
