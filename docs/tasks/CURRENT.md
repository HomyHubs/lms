# Task hiện tại (chỉ dùng khi làm tuần tự một mình)

Phạm vi sử dụng: chỉ dùng khi đúng một người/agent làm tuần tự.

## Đang làm

- ID Slice/Task: không còn slice nào mở trong backlog (chỉ còn slice-9 ở trạng thái Hoãn — chờ chủ dự án quyết).
- Cập nhật ngày: 2026-11-26
- Nhánh: `dev`
- Trạng thái: Đóng `slice-dashboard-movements` (phần 3–4).

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
- slice-dashboard-movements phần 3: rà 4 nhóm báo cáo; bổ sung biểu đồ thanh + tròn cho điểm danh (`TodayBarChart` theo ngày đang chọn, `TodayAttendanceBoard` theo bộ lọc cơ sở) + test đổi theo bộ lọc.
- slice-dashboard-movements phần 4: xác minh đã triển khai từ `d6190a3` (admin chấm công thay GV, `recorded_by` + `now()` trong `shift_events`, unique index chống trùng ca, 404 ngoài phạm vi, lịch sử thời điểm + người thao tác) — chỉ cập nhật tài liệu, không cần code thêm.

## Bước tiếp theo

1. Chạy cổng gác đầy đủ `pnpm -r build && pnpm -r lint && pnpm -r typecheck && pnpm -r test` trên `dev` trước khi release.
2. Kiểm tra giao diện thật trên trình duyệt/màn hình hẹp cho các biểu đồ mới (mới chỉ test jsdom).
3. `slice-9` (chấm bán tự động Speaking/Writing nâng cao + thông báo) vẫn Hoãn — cần chủ dự án chốt phạm vi.
4. Cân nhắc mở PR cho các commit trực tiếp trên `dev` nếu repo chuyển sang luồng review bắt buộc.
