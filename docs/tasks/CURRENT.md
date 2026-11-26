# Task hiện tại (chỉ dùng khi làm tuần tự một mình)

Phạm vi sử dụng: chỉ dùng khi đúng một người/agent làm tuần tự.

## Đang làm

- ID Slice/Task: slice-27 (Trung tâm cơ sở — cho sửa thông tin cơ sở, mục 10)
- Cập nhật ngày: 2026-11-26
- Nhánh: `dev`
- PR: — (commit trực tiếp trên `dev` theo thực tế repo local)
- Trạng thái: Đang làm — sau khi đóng nợ slice-17 và đồng bộ backlog.

### Việc trước đó

- ID Slice/Task: slice-17 (Điểm danh view — trả nợ widget calendar + test lọc ngày)
- Cập nhật ngày: 2026-11-26
- Nhánh: `dev`
- PR: — (commit trực tiếp)
- Trạng thái: Done — thêm `components/ui/date-picker.tsx`, thay `<input type="date">` trong `TodayBarChart`, bổ sung test lọc ngày; slice-17 chuyển từ "Done (còn nợ)" sang Done.

## Đã làm

- Rà backlog so với `git log`: slice-23 (#39), slice-30 (#40), slice-1.1 (#38), slice-6.1 (3185e7d), slice-10.1 (#34) đã merge nhưng backlog còn ghi Chưa bắt đầu/Đang làm → đã cập nhật trạng thái + rollup `AGENTS.md`.
- Thêm dòng backlog cho `slice-10.1` và `slice-dashboard-movements` (file đã tồn tại nhưng thiếu dòng chỉ mục).
- Đóng nợ slice-17: widget calendar in-house + test lọc theo ngày (typecheck/lint/vitest PASS).

## Bước tiếp theo

1. slice-27: PATCH cập nhật cơ sở + form sửa trên `CentersPage`.
2. slice-28: tạo lớp chọn cơ sở, chặn xóa lớp còn học viên, sơ đồ lộ trình cấp độ.
3. slice-29: Ghi danh & Quản lý — 2 panel (HV/GV theo lớp, quản lý theo cơ sở).
4. slice-25: Ngày công & giờ dạy chi tiết theo giáo viên/tháng + theo lớp + chart.
