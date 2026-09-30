# Task hiện tại (chỉ dùng khi làm tuần tự một mình)

Phạm vi sử dụng: chỉ dùng khi đúng một người/agent làm tuần tự.

## Đang làm

- ID Slice/Task: slice-4 (Tạo đề & Thi online)
- Cập nhật ngày: 2026-09-27
- Nhánh: `feature/slice-4-tao-de-thi-online`
- PR: #6
- Trạng thái: Đã sửa xong hai blocker; CI guard xanh trên HEAD `ca45ef8`; chờ review lại.

## Đã làm

- Shared/API/DB cho tạo đề, sinh đề, start/resume, deadline và submit.
- Frontend học viên `/exams`: danh sách đề, làm bài, đếm ngược, nộp thủ công/tự động và chặn nộp lại.
- Integration test dùng PostgreSQL thật cho store, concurrent start và submit.
- CI chạy migration, test thật và rollback/re-apply migration exams.

## Bước tiếp theo

1. Review lại PR #6 đúng SHA `ca45ef81e97a50f284d6e3551fe7200f888765b0` bằng identity độc lập.
2. Chỉ merge khi review mới không còn blocker và có formal approval hợp lệ.
