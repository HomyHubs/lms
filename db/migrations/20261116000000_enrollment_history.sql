-- migrate:up
alter table enrollments add column ended_at timestamptz;
alter table enrollments add constraint enrollments_end_after_start check (ended_at is null or ended_at >= created_at);
alter table enrollments drop constraint enrollments_class_id_student_id_key;
create unique index enrollments_active_class_student_idx on enrollments(class_id, student_id) where ended_at is null;

create table enrollment_events (
  id bigint generated always as identity primary key,
  enrollment_id uuid not null,
  class_id uuid not null,
  student_id uuid not null,
  branch_id uuid,
  event_type text not null check (event_type in ('enrolled', 'withdrawn')),
  occurred_at timestamptz not null,
  is_backfilled boolean not null default false,
  unique (enrollment_id, event_type)
);
create index enrollment_events_branch_time_idx on enrollment_events(branch_id, occurred_at);

-- The historical branch at enrollment is unknown for existing rows.
insert into enrollment_events(enrollment_id, class_id, student_id, event_type, occurred_at, is_backfilled)
select id, class_id, student_id, 'enrolled', created_at, true from enrollments;

create function record_enrollment_event() returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    insert into enrollment_events(enrollment_id, class_id, student_id, branch_id, event_type, occurred_at)
    select new.id, new.class_id, new.student_id, branch_id, 'enrolled', new.created_at from classes where id = new.class_id;
  elsif old.ended_at is null and new.ended_at is not null then
    insert into enrollment_events(enrollment_id, class_id, student_id, branch_id, event_type, occurred_at)
    select new.id, new.class_id, new.student_id, branch_id, 'withdrawn', new.ended_at from classes where id = new.class_id;
  end if;
  return new;
end $$;
create trigger enrollment_event_after_insert after insert on enrollments for each row execute function record_enrollment_event();
create trigger enrollment_event_after_end after update of ended_at on enrollments for each row execute function record_enrollment_event();

-- migrate:down
do $$
begin
  if exists (select 1 from enrollment_events where not is_backfilled) then
    raise exception 'Cannot roll back: enrollment history would be lost';
  end if;
end $$;
drop trigger enrollment_event_after_end on enrollments;
drop trigger enrollment_event_after_insert on enrollments;
drop function record_enrollment_event();
drop table enrollment_events;
drop index enrollments_active_class_student_idx;
alter table enrollments add constraint enrollments_class_id_student_id_key unique (class_id, student_id);
alter table enrollments drop constraint enrollments_end_after_start;
alter table enrollments drop column ended_at;
