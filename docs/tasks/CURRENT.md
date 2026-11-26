# Task hiện tại (chỉ dùng khi làm tuần tự một mình)

Phạm vi sử dụng: chỉ dùng khi đúng một người/agent làm tuần tự.

## Đang làm

- ID Slice/Task: không còn slice nào ở trạng thái "Chưa bắt đầu"/"Đang làm" trong backlog (trừ slice-9 Hoãn và slice-dashboard-movements đang dở theo đặc tả riêng).
- Cập nhật ngày: 2026-11-26
- Nhánh: `dev`
- Trạng thái: Đã đóng 4 slice (27, 28, 29, 25) + trả nợ slice-17 + đồng bộ tài liệu.

### Việc trước đó

- ID Slice/Task: slice-25 (Ngày công & giờ dạy chi tiết theo giáo viên/tháng + theo lớp + chart)
- Cập nhật ngày: 2026-11-26
- Nhánh: `dev`
- PR: — (commit trực tiếp trên `dev` theo thực tế repo local)
- Trạng thái: Done.

## Đã làm (phiên 2026-11-26)

- Trả nợ slice-17: `components/ui/date-picker.tsx` (calendar popover in-house) thay `<input type="date">`; test lọc ngày trong `AttendancePage.test.tsx` (stub đúng schema `TodayClassSummary` có `startsAt`). slice-17 → Done.
- Đồng bộ backlog với git log: slice-23 (#39), slice-30 (#40), slice-1.1 (#38), slice-6.1 (3185e7d), slice-10.1 (#34) → Done; thêm dòng chỉ mục cho `slice-10.1` và `slice-dashboard-movements`.
- slice-27: sửa inline trung tâm/cơ sở (FE + api `updateCenter`/`updateBranch`, hook, test).
- slice-28: chặn xoá lớp còn học viên (409), `LevelRoadmap` (Starter→Mover→Flyer), cột khoá học, test API + FE.
- slice-29: trang "Ghi danh & Quản lý" 2 panel (HV/GV theo lớp, quản lý theo cơ sở), đổi nhãn menu, test.
- slice-25: `work-hours-detail.ts` (thuần) + chi tiết theo giáo viên, bảng/biểu đồ giờ dạy theo lớp, test.

## Bước tiếp theo

1. `slice-9` (Hoãn) và `slice-dashboard-movements` (phần 3–4: biểu đồ tổng hợp, chấm công giáo viên nâng cao) — cần chủ dự án chốt phạm vi trước khi làm.
2. Chạy lại cổng gác đầy đủ `pnpm -r build && pnpm -r lint && pnpm -r typecheck && pnpm -r test` trên `dev` trước khi release.
3. Cân nhắc mở PR cho các commit trực tiếp trên `dev` nếu repo chuyển sang luồng review bắt buộc.
