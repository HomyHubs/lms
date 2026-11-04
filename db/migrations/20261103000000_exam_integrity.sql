-- migrate:up
alter table exam_attempts add column question_snapshot text;
alter table exam_attempts add column session_key text;
alter table exam_attempts add column answer_revision integer not null default 0 check (answer_revision >= 0);

-- Legacy backfill is current bank state, not a reconstruction of historical edits.
update exam_attempts a set question_snapshot = (
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', q.id, 'question_text', q.question_text, 'question_type', q.question_type,
    'skill', q.skill, 'points', q.points, 'options', q.options,
    'correct_answer', q.correct_answer, 'explanation', q.explanation
  ) order by p.ordinality), '[]'::jsonb)::text
  from jsonb_array_elements_text(a.question_ids::jsonb) with ordinality p(id, ordinality)
  join questions q on q.id::text = p.id
);

create function protect_exam_snapshot() returns trigger language plpgsql as $$
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
create trigger exam_snapshot_immutable before update on exam_attempts
for each row execute function protect_exam_snapshot();

-- migrate:down
drop trigger exam_snapshot_immutable on exam_attempts;
drop function protect_exam_snapshot();
alter table exam_attempts drop column answer_revision;
alter table exam_attempts drop column session_key;
alter table exam_attempts drop column question_snapshot;
