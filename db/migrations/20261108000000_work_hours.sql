-- migrate:up
-- slice-8: work days (staff check-in/out) and teaching hours computed from real attendance.
-- See docs/adr/0007-work-hours.md.

alter table class_sessions
  add column if not exists duration_minutes integer not null default 90
    check (duration_minutes between 15 and 480),
  add column if not exists planned_teacher_id uuid references users(id) on delete set null,
  add column if not exists makeup_for_session_id uuid references class_sessions(id) on delete set null,
  add column if not exists cancelled_at timestamptz;

-- Existing sessions were planned by the teacher who created them.
update class_sessions set planned_teacher_id = created_by where planned_teacher_id is null;

create index if not exists class_sessions_session_date_idx on class_sessions(session_date);

-- One row per check-in; check_out_at stays null while the shift is open.
create table if not exists staff_shifts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  check_in_at timestamptz not null default now(),
  check_out_at timestamptz,
  check (check_out_at is null or check_out_at > check_in_at)
);

create index if not exists staff_shifts_user_check_in_idx on staff_shifts(user_id, check_in_at);
-- At most one open shift per user: a double check-in is rejected by the database.
create unique index if not exists staff_shifts_one_open_idx on staff_shifts(user_id) where check_out_at is null;

-- migrate:down
drop table if exists staff_shifts;
drop index if exists class_sessions_session_date_idx;
alter table class_sessions
  drop column if exists cancelled_at,
  drop column if exists makeup_for_session_id,
  drop column if exists planned_teacher_id,
  drop column if exists duration_minutes;
