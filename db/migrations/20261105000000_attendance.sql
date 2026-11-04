-- migrate:up
-- slice-6: Attendance. Additive only (AGENTS.md section 16): new tables, fully reversible.
-- class_teachers: teachers assigned to a class (basis for RBAC "only the class teacher may mark attendance").
-- class_sessions: sessions of a class (unique per class x date x start time).
-- attendance_records: attendance status of a student in one session (one row per student per session).

create table if not exists class_teachers (
  class_id uuid not null references classes(id) on delete cascade,
  teacher_id uuid not null references users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (class_id, teacher_id)
);

create index if not exists class_teachers_teacher_id_idx on class_teachers(teacher_id);

create table if not exists class_sessions (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references classes(id) on delete cascade,
  session_date date not null,
  starts_at time not null default '00:00',
  topic text,
  created_by uuid not null references users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (class_id, session_date, starts_at)
);

create index if not exists class_sessions_class_date_idx on class_sessions(class_id, session_date);

create table if not exists attendance_records (
  session_id uuid not null references class_sessions(id) on delete cascade,
  student_id uuid not null references users(id) on delete cascade,
  status text not null check (status in ('present', 'absent', 'late', 'excused')),
  note text,
  recorded_by uuid not null references users(id),
  recorded_at timestamptz not null default now(),
  primary key (session_id, student_id)
);

create index if not exists attendance_records_student_id_idx on attendance_records(student_id);

-- migrate:down
drop table if exists attendance_records;
drop table if exists class_sessions;
drop table if exists class_teachers;
