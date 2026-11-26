# Task hiện tại (chỉ dùng khi làm tuần tự một mình)

Phạm vi sử dụng: chỉ dùng khi đúng một người/agent làm tuần tự.

## Đang làm

- ID Slice/Task: không còn slice nào mở trong backlog (slice-9 đã **hủy** 2026-11-26 — xem bên dưới).
- Cập nhật ngày: 2026-11-26
- Nhánh: `dev`
- Trạng thái: Hủy `slice-9` theo quyết định chủ sở hữu (chỉ sửa tài liệu + comment).

### Việc trước đó

- ID Slice/Task: slice-dashboard-movements (phần 3–4: biểu đồ tổng hợp, chấm công GV nâng cao)
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
- Gia cố slice-30: `studentCode` lấy thật từ `users.student_code` (hết hardcode `null`), tìm kiếm theo mã học viên, panel "Thời gian học" (`study`: số buổi + tổng phút, chỉ tính buổi `present`/`late`), cột "Mã HV" ở danh sách; thêm `routes.test.ts` (14 case) + component test `StudentsPage` (3) / `StudentDetailPage` (3); stub `ResizeObserver` toàn cục trong `src/test/setup.ts` để recharts chạy được dưới jsdom.
- Cổng sau gia cố: API typecheck + eslint sạch, 282 pass / 22 skip; Web typecheck + eslint sạch, 113 pass; `vite build` OK (cảnh báo chunk >500 kB là có sẵn).
- **Hủy `slice-9`** theo quyết định chủ sở hữu: bỏ hẳn chấm bán tự động; audio/ghi âm cho Listening/Speaking **không xây trong LMS** — giáo viên tự chấm và đưa kết quả vào lớp bằng luồng đã có (`slice-9a` chấm tay/import Excel + `slice-22` đưa điểm vào lớp). Trạng thái backlog `Hoãn` → `Đã hủy`; gỡ marker `TODO(slice-9)` ở migration `20260921000000_questions.sql` và 4 slice doc (`slice-3`, `slice-5`, `slice-6`, `slice-12`); cập nhật ADR 0003/0013, `AGENTS.md`, `HANDOFF-BY-CATEGORY.md`, `design/ui-reference.md`. Không sửa code nghiệp vụ.

## Bước tiếp theo

1. ~~Chạy cổng gác đầy đủ `pnpm -r build && pnpm -r lint && pnpm -r typecheck && pnpm -r test` trên `dev` trước khi release.~~ **Đã chạy 2026-11-26: build 3/3, lint 4/4, typecheck 5/5, test 5/5 — tất cả PASS** (API 282 pass / 22 skip do cần Postgres; web 113 pass; shared pass).
2. Kiểm tra giao diện thật trên trình duyệt/màn hình hẹp cho các biểu đồ mới (mới chỉ test jsdom — `ResponsiveContainer` không đo được kích thước trong jsdom nên test chỉ assert số liệu/nhãn).
3. ~~`slice-9` vẫn Hoãn — cần chủ dự án chốt phạm vi.~~ **Đã chốt 2026-11-26: hủy slice-9.**
4. Cân nhắc mở PR cho các commit trực tiếp trên `dev` nếu repo chuyển sang luồng review bắt buộc.
5. Đồng bộ công thức xếp loại học lực giữa `students/service.ts` và `reports/service.ts` khi slice-7 chốt (đang ghi nợ `TODO(slice-30)`).
6. (Tùy chọn, ngoài phạm vi slice) Bundle web còn 1 chunk ~1.06 MB — có thể `manualChunks` tách recharts/vendor nếu muốn hết cảnh báo >500 kB.
7. Nếu sau này cần nhắc điểm danh tự động hoặc audio trong LMS: **mở slice mới** (ID slice-9 không tái sử dụng), trả lời 3 câu ở mục "Nếu sau này muốn mở lại" trong `slices/slice-9-mo-rong.md`.
