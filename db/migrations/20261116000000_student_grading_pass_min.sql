-- migrate:up
-- slice-7: nguong Dau/Rot cau hinh theo cap do. finalScore >= pass_min => Dau.
alter table student_grading_policies
  add column if not exists pass_min integer not null default 50 check (pass_min between 0 and 100);

-- migrate:down
alter table student_grading_policies drop column if exists pass_min;
