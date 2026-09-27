# Task hiện tại (chỉ dùng khi làm tuần tự một mình)

Phạm vi sử dụng: CHỈ áp dụng khi đúng một người hoặc một agent làm việc, không có ai khác chạy song song trên repo này. Ngay khi có dev/agent thứ hai bắt đầu làm song song, ngừng cập nhật file này và chuyển hẳn sang dùng `MVP-BACKLOG.md` (cột Owner) và `AGENTS.md` của từng feature.

## Đang làm

- ID Slice/Task: slice-4 (Tạo đề & Thi online)
- Cập nhật ngày: 2026-09-27
- Nhánh làm việc: `feature/slice-4-tao-de-thi-online` (base = `dev`)
- PR: #6
- Trạng thái: Review — chưa đủ điều kiện merge.

## Đã làm

- Shared contract cho đề thi và lượt thi.
- API tạo/list đề, bắt đầu/resume lượt thi, lấy lượt thi và nộp bài.
- RBAC Admin/Teacher/Student và lọc đề đang mở cho học viên.
- Sinh đề ngẫu nhiên theo Level + Skill; tránh lặp nguyên đề liên tiếp.
- Chống đua khi bắt đầu lượt thi; hết giờ vẫn ép nộp phần đã làm.
- Migration additive cho `exams` và `exam_attempts`.
- CI `guard` trên HEAD trước khi cập nhật trạng thái đã xanh.

## Đang làm dở / còn thiếu

- Chưa có frontend cho học viên xem đề, làm bài, đếm ngược và nộp bài; `apps/web` không có thay đổi trong PR #6, trong khi Task 2-3 yêu cầu `api/web`.
- Chưa chạy migration up/down và luồng exams trên PostgreSQL thật; store và ràng buộc unique mới chỉ được kiểm thử bằng fake store.
- Review mới nhất phải được thực hiện lại trên HEAD hiện tại sau commit đồng bộ trạng thái.

## Bước tiếp theo

1. Bổ sung frontend thi online và test luồng học viên.
2. Thêm/chạy kiểm thử tích hợp exams trên PostgreSQL thật, gồm concurrent start và migration rollback.
3. Chạy lại toàn bộ gate, review lại đúng HEAD, rồi mới xin formal approval bằng identity khác người tạo PR.

## Bàn giao phiên

Nguồn chi tiết: `slices/slice-4-tao-de-thi-online.md` và nhật ký feature liên quan.
