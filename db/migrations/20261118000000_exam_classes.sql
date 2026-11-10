-- migrate:up
-- slice-14: gan de thi (exam) cho mot hoac nhieu LOP cung cap do (many-to-many).
-- Khi de co lop duoc gan -> chi hoc vien ghi danh cac lop do thuoc pham vi (visibility/grading);
-- khi KHONG gan lop nao -> giu hanh vi cu (ap theo cap do). Bang noi, xoa theo de/lop.

create table if not exists exam_classes (
  exam_id uuid not null references exams(id) on delete cascade,
  class_id uuid not null references classes(id) on delete cascade,
  primary key (exam_id, class_id)
);
create index if not exists exam_classes_class_idx on exam_classes (class_id);

-- migrate:down
drop table if exists exam_classes;
