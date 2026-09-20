-- migrate:up
-- slice-1 Task 3: Level (Starter/Mover/Flyer) + Course + Class + Enrollment.
-- Cay: Level -> Course -> Class (moi Class gan 1 Branch) -> Enrollment (hoc vien - lop).
-- Additive (AGENTS.md muc 16): chi them bang moi, dao nguoc duoc.

create table if not exists levels (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null
);

-- Seed 3 cap do co dinh (idempotent).
insert into levels (code, name) values
  ('starter', 'Starter'),
  ('mover', 'Mover'),
  ('flyer', 'Flyer')
on conflict (code) do nothing;

create table if not exists courses (
  id uuid primary key default gen_random_uuid(),
  level_id uuid not null references levels(id),
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists courses_level_id_idx on courses(level_id);

create table if not exists classes (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references courses(id) on delete cascade,
  -- Moi Class gan dung 1 Branch (co so).
  branch_id uuid not null references branches(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists classes_course_id_idx on classes(course_id);
create index if not exists classes_branch_id_idx on classes(branch_id);

create table if not exists enrollments (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references classes(id) on delete cascade,
  student_id uuid not null references users(id) on delete cascade,
  created_at timestamptz not null default now(),
  -- Mot hoc vien chi ghi danh mot lan vao mot lop.
  unique (class_id, student_id)
);

create index if not exists enrollments_class_id_idx on enrollments(class_id);
create index if not exists enrollments_student_id_idx on enrollments(student_id);

-- migrate:down
drop table if exists enrollments;
drop table if exists classes;
drop table if exists courses;
drop table if exists levels;
