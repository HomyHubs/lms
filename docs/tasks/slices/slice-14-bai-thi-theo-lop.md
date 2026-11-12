# Slice/Task slice-14 — Bài thi theo lớp (gán đề cho lớp cụ thể)

- Cơ chế: Dọc
- Owner hiện tại: Hoang Hoang HA
- Nhánh: `dev`
- PR: —
- Trạng thái: xem `../MVP-BACKLOG.md`
- Phụ thuộc: slice-4 (tạo đề thi), slice-1 (phân quyền chi nhánh), slice-5 (import chấm điểm). Tất cả Done.
- Sửa mục gốc: để trống

## Hiện trạng (trước slice)

- Đề thi (`exams`) gắn với một `level`; mọi học viên đủ điều kiện trong cấp độ/chi nhánh đều có thể dự thi. Không có cách giới hạn đề cho một hoặc vài lớp cụ thể.
- Import bảng điểm (`POST /grading/import`, slice-5) lọc học viên theo phạm vi chi nhánh của người chấm, chưa lọc theo lớp được gán cho đề.
- Form tạo đề (`BlueprintForm.tsx`) chỉ chọn cấp độ, chưa chọn lớp.
- Chỉ `admin`/manager được tạo đề; `teacher`/`staff` chưa được.

## Mục tiêu bấm được / nghiệm thu được

Người tạo đề (admin, teacher, staff, superadmin) có thể gán đề cho một hoặc nhiều lớp **cùng cấp độ** với đề. Khi đề đã gán lớp, chỉ học viên thuộc các lớp đó (giao với phạm vi chi nhánh) mới được nghiệm thu khi import bảng điểm. Để trống = áp dụng toàn cấp độ (hành vi cũ). Non-superadmin chỉ gán được lớp trong chi nhánh mình quản lý.

## Task

| # | Task | Tầng | Ghi chú |
| --- | --- | --- | --- |
| 1 | **Migration bảng nối.** `exam_classes(exam_id uuid FK exams, class_id uuid FK classes, PRIMARY KEY(exam_id,class_id))` + index `exam_classes_class_idx(class_id)`. Đảo ngược được. | DB | `20261118000000_exam_classes.sql` |
| 2 | **Contract + API tạo đề.** `packages/shared/src/exams.ts`: `classIds` (mảng UUID ≤100, optional) ở blueprint; `classIds` (mảng, default []) ở response `Exam`. `createExam` validate mọi lớp thuộc đúng cấp độ của đề (`class_level_mismatch`); non-superadmin bị chặn lớp ngoài chi nhánh (`class_out_of_scope`, 403). `POST /exams` cho phép `admin,teacher,staff` (+superadmin). | API | `exams/{service,store,routes}.ts`, `catalog/routes.ts` |
| 3 | **Import điểm lọc theo lớp.** `importGrades`: nếu đề có lớp gán, giao danh sách SĐT học viên trong các lớp đó với phạm vi chi nhánh → chỉ nghiệm thu học viên trong giao đó. | API | `listStudentPhonesInClasses` |
| 4 | **UI multi-select lớp.** `BlueprintForm.tsx`: chọn cấp độ (controlled) → hiện checkbox các lớp cùng cấp độ; đổi cấp độ thì bỏ lớp không còn hợp lệ; gửi `classIds`. Nhãn: "Lớp áp dụng (tùy chọn — để trống = toàn cấp độ)". | Web | dùng `useLevels/useCourses/useClasses` |
| 5 | **Tests + docs + commit.** Unit service/routes (API), component (web), cập nhật test catalog cho teacher/staff đọc levels/courses/classes. Docs slice + backlog + rollup. | - | — |

## Stub cho phép

Sửa (PATCH) danh sách lớp sau khi tạo đề — để sau (hiện chỉ gán lúc tạo).

## Không được stub

Validate lớp cùng cấp độ với đề; RBAC chặn gán lớp ngoài chi nhánh cho non-superadmin; import điểm giao theo lớp gán thật (không bỏ qua).

## Nợ kỹ thuật

| Marker | Vị trí | Nội dung | Dự kiến trả |
| --- | --- | --- | --- |
| TODO(slice-14) | `exams/routes.ts` | Chưa có endpoint sửa danh sách lớp của đề đã tạo | Khi có yêu cầu |

## Nhật ký thay đổi phạm vi của riêng Slice/Task này

| Ngày | Loại | Nội dung | Lý do | ADR |
| --- | --- | --- | --- | --- |
| 2026-11-10 | Thêm | Tạo slice: bảng nối `exam_classes`, gán đề theo lớp, import lọc theo lớp, UI multi-select | Yêu cầu giới hạn bài thi cho lớp cụ thể thay vì toàn cấp độ | — |
