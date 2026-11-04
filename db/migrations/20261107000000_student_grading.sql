-- migrate:up
-- slice-7: student classification policy per level.
-- final = exam_weight% * exam score + attendance_weight% * attendance rate (default 90/10),
-- classification bands on the final score. See docs/adr/0006-student-grading-dashboard.md.

create table if not exists student_grading_policies (
  level_id uuid primary key references levels(id) on delete cascade,
  exam_weight integer not null default 90 check (exam_weight between 0 and 100),
  attendance_weight integer not null default 10 check (attendance_weight between 0 and 100),
  excellent_min integer not null default 85 check (excellent_min between 0 and 100),
  good_min integer not null default 70 check (good_min between 0 and 100),
  average_min integer not null default 50 check (average_min between 0 and 100),
  updated_at timestamptz not null default now(),
  check (exam_weight + attendance_weight = 100),
  check (excellent_min >= good_min and good_min >= average_min)
);

insert into student_grading_policies (level_id)
select id from levels
on conflict (level_id) do nothing;

-- migrate:down
drop table if exists student_grading_policies;
