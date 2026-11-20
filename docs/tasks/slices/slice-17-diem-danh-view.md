# Slice 17 — Điểm danh (view)

- Cơ chế: Dọc
- Owner hiện tại: —
- Nhánh: —
- PR: —
- Trạng thái: xem `../MVP-BACKLOG.md` (nguồn trạng thái duy nhất)
- Phụ thuộc: slice-6
- Sửa mục gốc: —

## Mục tiêu bấm được / nghiệm thu được

- Admin mở trang Điểm danh (`/attendance`): có lịch (calendar) chọn ngày để xem điểm danh của ngày bất kỳ, mặc định hôm nay (giờ VN).
- Mặc định hiển thị biểu đồ điểm danh của tất cả lớp (trung tâm) có buổi học, nhóm theo cơ sở.
- Giao diện gọn, sang trọng, dễ đọc: card, màu theo trạng thái (có mặt / đi muộn / vắng / có phép), responsive.

## Task

| # | Task | Tầng | Ghi chú |
| --- | --- | --- | --- |
| 1 | **Lịch chọn ngày (2.1).** `TodayBarChart` trong `apps/web/src/features/attendance/AttendancePage.tsx` đã có `<input type="date">` + nút "Hôm nay" gọi `useTodayAttendanceSummary(true, selectedDate)`. Nâng cấp thành lịch dễ dùng (calendar), giữ mặc định rỗng = hôm nay (do API quyết định theo giờ VN). | FE | Hook `useTodayAttendanceSummary(enabled, date)` ở `useAttendance.ts` đã nhận `date?`. |
| 2 | **Nhóm theo cơ sở (2.2).** `TodayBarChart` hiện render danh sách phẳng các lớp. Gom các lớp theo cơ sở: tiêu đề mỗi nhóm là tên cơ sở, dưới là biểu đồ điểm danh từng lớp. Cần `branchId`/`branchName` trong mỗi dòng today-summary (Task 5). | FE | `AttendancePage.tsx` — `TodayBarChart` (render cho admin trong `StaffView`). |
| 3 | **Biểu đồ điểm danh hôm nay (2.2).** Mỗi lớp hiển thị biểu đồ điểm danh theo trạng thái (hiện là thanh CSS phân đoạn present/late/absent/excused/notMarked trong `TodayBarChart`). Giữ hoặc nâng lên recharts; mặc định dữ liệu = hôm nay. | FE | Dữ liệu từ `TodayClassSummary` (present/late/absent/excused/notMarked/total/ratePercent). |
| 4 | **GUI sang trọng (2.3).** Dùng `Card`/`CardTitle`/`PageHeader` (`@/components/ui/card`) và token màu `TONE_TILE` (success/warning/danger/accent) cho trạng thái; bố cục lưới theo cơ sở, khoảng cách và tiêu đề rõ ràng, responsive. | FE | Giữ phong cách shadcn/Tailwind của `apps/web` (không trộn thư viện khác). |
| 5 | **API: thêm cơ sở vào today-summary (2.2).** Bổ sung `branchId` + `branchName` vào từng dòng của `GET /api/attendance/today-summary`: sửa `listSessionsOnDate` (`apps/api/src/features/attendance/store.ts`, `TodaySessionRow` hiện có `class_id/class_name/starts_at/enrolled_count`) để join branch; sửa `buildTodaySummary` (`service.ts`) đẩy `branchId/branchName` vào `TodayClassSummary`. Giữ `requireAdmin` + branch-scope (`scopeOf`). | API | Endpoint đã nhận `?date=YYYY-MM-DD` (validate regex, mặc định hôm nay giờ VN). |
| 6 | **Shared type (2.2).** Bổ sung `branchId`, `branchName` vào type `TodayClassSummary` (`@lms/shared`, `packages/shared`) để FE nhóm theo cơ sở. | Shared | — |

## Stub cho phép

- Có thể giữ biểu đồ thanh CSS phân đoạn hiện tại nếu chưa cần recharts; hiệu ứng/đồ hoạ nâng cao để sau.
- Nếu một cơ sở chưa có buổi học trong ngày thì ẩn nhóm đó (không hiện nhóm rỗng).

## Không được stub

Xác thực, phân quyền, hạn mức, chuỗi hiển thị — trừ khi ghi khác trong ADR.
Branch-scope (admin chỉ thấy cơ sở được phân quyền — slice-1) và ngày lấy theo giờ VN từ server (không nhận giờ client) phải giữ nguyên; số liệu điểm danh tính từ dữ liệu thật.

## Nợ kỹ thuật

| Marker | Vị trí | Nội dung | Dự kiến trả |
| --- | --- | --- | --- |
| PERF(slice-17) | `buildTodaySummary` (`apps/api/src/features/attendance/service.ts`) | Gọi `store.listRecords` theo từng buổi (N query); gom thành một query nếu nhiều lớp | Khi số lớp/ngày lớn |
| UI(slice-17) | `TodayBarChart` (`apps/web/src/features/attendance/AttendancePage.tsx`) | Bộ chọn ngày dùng `<input type="date">` gốc + preset Hôm nay/Hôm qua; chưa có widget calendar/popover vì `apps/web/src/components/ui/` chưa có `calendar.tsx`/`popover.tsx` (không thêm thư viện ngoài theo quy tắc) | Khi bổ sung primitive calendar/popover vào design system |

## Nhật ký thay đổi phạm vi của riêng Slice/Task này

| Ngày | Loại | Nội dung | Lý do | ADR |
| --- | --- | --- | --- | --- |
| 2026-11-12 | Thêm | Tạo slice | Yêu cầu màn xem điểm danh: lịch chọn ngày, nhóm theo cơ sở, GUI đẹp (mục 2.1–2.3) | — |
| 2026-11-13 | Sửa | Hoàn thiện slice: sửa `listSessionsOnDate` để `dateIso` thật sự lọc theo ngày (`session_date = ${dateIso}::date`, bỏ `TODO(slice-16)` hardcode hôm nay); nâng bộ chọn ngày (icon calendar + preset Hôm nay/Hôm qua); các task 2–6 (nhóm theo cơ sở, chart trạng thái, Card/TONE, branch join, shared type) đã có sẵn từ trước. Typecheck + lint (`--max-warnings=0`) PASS. | Chọn ngày trên lịch trước đây chỉ là cosmetic — API luôn trả hôm nay (nghiệm thu #2 chưa đạt). | — |

## Cách nghiệm thu

1. [x] Admin mở `/attendance` → thấy biểu đồ điểm danh hôm nay, các lớp được nhóm theo cơ sở với tiêu đề cơ sở.
2. [x] Chọn một ngày khác trên lịch → dữ liệu đổi theo ngày (đã sửa `listSessionsOnDate` lọc theo `dateIso`); nút "Hôm nay" đưa về hôm nay, thêm preset "Hôm qua".
3. [x] GV chỉ thấy cơ sở trong phạm vi được phân quyền (branch-scope giữ nguyên); ngày sai định dạng → API trả 400 (validate ở `routes.ts`).
4. [x] Giao diện gọn, rõ, hiển thị tốt ở màn hình hẹp (Card/CardTitle + lưới responsive + TONE màu trạng thái).
5. [ ] Test tự động: `AttendancePage.test.tsx` + `routes.test.ts` + `store.integration.test.ts` — chưa bổ sung case lọc theo `dateIso`/preset trong phiên này (typecheck + lint `--max-warnings=0` đã PASS). Nợ test ghi ở mục Nợ kỹ thuật nếu cần bổ sung.

## Bàn giao phiên gần nhất
