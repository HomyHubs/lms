-- migrate:up
-- Preserve attribution independently of the attendance recorder (ADR 0014).
create table session_teacher_events (
  id bigint generated always as identity primary key,
  session_id uuid not null references class_sessions(id) on delete cascade,
  teacher_id uuid not null references users(id),
  recorded_by uuid not null references users(id),
  recorded_at timestamptz not null default now()
);
create index session_teacher_events_session_id_idx on session_teacher_events(session_id, id desc);

insert into session_teacher_events (session_id, teacher_id, recorded_by, recorded_at)
select session_id, recorded_by, recorded_by, recorded_at
from (
  select distinct on (session_id) session_id, recorded_by, recorded_at
  from attendance_records
  order by session_id, recorded_at desc, student_id
) as latest;

alter table attendance_records
  add column arrived_at timestamptz,
  add column late_minutes integer check (late_minutes in (5, 10, 15, 20));

create table attendance_events (
  id bigint generated always as identity primary key,
  session_id uuid not null references class_sessions(id) on delete cascade,
  student_id uuid not null references users(id),
  status text not null check (status in ('present', 'absent', 'late', 'excused')),
  note text,
  arrived_at timestamptz,
  late_minutes integer check (late_minutes in (5, 10, 15, 20)),
  recorded_by uuid not null references users(id),
  recorded_at timestamptz not null default now()
);
insert into attendance_events (session_id, student_id, status, note, recorded_by, recorded_at)
select session_id, student_id, status, note, recorded_by, recorded_at from attendance_records;

-- migrate:down
drop table attendance_events;
alter table attendance_records drop column late_minutes, drop column arrived_at;
drop table session_teacher_events;
