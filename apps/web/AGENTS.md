# AGENTS.md — apps/web (frontend React)

Nhật ký này thuộc riêng feature/nhánh này. Cập nhật liên tục, tối thiểu mỗi ngày làm việc.

## Bối cảnh feature

- Nhiệm vụ: Frontend React 19 + Vite + TypeScript. Slice-0 hiển thị trạng thái kết nối Database lấy từ backend health-check thật.
- Slice/Task đang triển khai: slice-4, xem `docs/tasks/slices/slice-4-tao-de-thi-online.md`
- Phụ thuộc module nào, qua cửa công khai nào: `@lms/shared` (`HealthResponse`); gọi API qua proxy `/api` (vite.config.ts).
- Profile UI: **B — Tailwind CSS + shadcn/ui + lucide-react** (chốt tại slice-0, xem webapp-template mục 8). KHÔNG trộn MUI.
- Owner hiện tại: An Vo
- Nhánh: feature/slice-4-tao-de-thi-online

## Contract (cửa công khai — chốt trước, không đổi giữa chừng)

- `fetchHealth()` → `HealthResponse`: gọi `/api/health`, validate bằng Zod schema dùng chung.
- Component `App`: router (`/login`, `/forgot-password` công khai; `/` được `RequireAuth` bảo vệ).
- API client (`src/lib/api.ts`): `login/fetchMe/logout`, `forgotPassword/resetPassword`; `ApiError`.
- Hook `useAuth`: `useSession/useLogin/useLogout/useForgotPassword/useResetPassword`.
- `cn(...)` (src/lib/utils.ts): helper className chuẩn shadcn.

## Nhật ký liên tục (thêm mục mới mỗi ngày, không ghi đè mục cũ)

### 2026-11-10

**Đã xong**

- slice-9a (Chấm tay): route `/grading` "Chấm bài" (Admin/GV, mục trong `NAV_ITEMS`). Bảng bài chờ chấm → mở bài (câu hỏi + trả lời) → nhập điểm từng câu + nhận xét → lưu. Học viên thấy "Nhận xét của giáo viên" trong kết quả (`ExamsPage`). Hook `useGrading`; test `GradingPage.test.tsx`.

### 2026-11-09

**Đã xong**

- slice-10 (Giao diện chung): `AppShell` (sidebar theo vai trò, thanh trên có chip DB, SĐT + vai trò, đăng xuất) bọc mọi route sau đăng nhập. `components/layout/nav.ts` `NAV_ITEMS` là nguồn duy nhất cho sidebar, lối tắt dashboard và guard vai trò trong `App.tsx`. Token màu theo vai trò trong `tailwind.config.js`; pattern class `.c-card/.c-section-title/.c-hero/.c-input/.c-table` (`index.css`); component `Card/CardTitle/StatCard/Badge/PageHeader` (`components/ui/card.tsx`), `buttonVariants`, `TONE_TILE`. Trang chủ = dashboard theo vai trò. Các trang cũ bỏ `<main>`/link "Trang chủ" riêng. Test shell theo 4 vai trò trong `App.test.tsx`. Xem `docs/design/ui-reference.md`, ADR 0008.

### 2026-11-08

**Đã xong**

- slice-8 (Ngày công & giờ dạy): route `/work-hours` (Admin/Teacher/Staff), link "Ngày công & giờ dạy" ở trang chủ. Staff/GV: check-in/check-out, bảng công tháng (+ thẻ giờ dạy cho GV). Admin: lọc tháng/cơ sở, thẻ tổng, bảng GV/nhân viên/lịch dự kiến vs thực tế, xuất Excel (`workHoursToSheets` + `buildXlsx`). Trang Điểm danh: thời lượng buổi, "Dạy bù cho buổi", "Huỷ buổi". Trang đầu tiên theo giao diện tham khảo `docs/design/ui-reference.md` (CARD/StatCard cục bộ — sẽ tách thành component chung ở slice UI shell). Hook `useWorkHours`; test `WorkHoursPage.test.tsx`.

### 2026-11-07

**Đã xong**

- slice-7 (Xếp loại & Dashboard): route `/reports` (Admin), link "Báo cáo & xếp loại" ở trang chủ. Lọc cơ sở/cấp độ/lớp/từ-đến ngày; thẻ tổng quan, biểu đồ thanh CSS (xếp loại, đạt/trượt theo lớp/cấp độ/tháng), bảng xếp hạng + thi lại, sửa cấu hình xếp loại theo cấp độ. Xuất Excel: `src/lib/xlsx-export.ts` (`buildXlsx`, `downloadFile`; dùng lại cho slice-8) + `reportToSheets`; In/PDF: `window.print()` (`print:hidden` cho phần điều khiển). Hook `useReports`; test `ReportsPage.test.tsx`.

### 2026-11-06

**Đã xong**

- slice-4.5 (Sinh prompt AI): route `/ai-questions` (Admin/Teacher), link "Ngân hàng câu hỏi" + "Sinh câu hỏi AI" ở trang chủ. Chọn level/skill/type/difficulty/số lượng + đề mẫu → prompt để copy; dán JSON/CSV (`parseAiResultText` bỏ ``` fence) → hàng chờ duyệt (sửa/duyệt/loại) → lưu vào ngân hàng. Badge "AI" ở `QuestionsPage`. Hook `useAiGeneration`; test `AiQuestionsPage.test.tsx`.

### 2026-11-05

**Đã xong**

- slice-6 (Điểm danh): route `/attendance` (Admin/Teacher/Student), link "Điểm danh" ở trang chủ. GV: chọn lớp phụ trách → tạo buổi → điểm danh từng học viên. Admin: gán GV cho lớp, xem buổi/điểm danh (chỉ đọc), tỷ lệ chuyên cần + lịch sử từng học viên. Học viên: lịch sử + tỷ lệ của mình. API client + hook `useAttendance`; test `AttendancePage.test.tsx`.

### 2026-09-14

**Đã xong**

- Dựng khung apps/web: React 19 + Vite + Tailwind v3 + shadcn-style Button, TanStack Query.
- Trang chủ gọi `/api/health` (proxy sang Fastify) và hiển thị trạng thái Database THẬT.
- Test render bằng Testing Library (stub fetch → hiển thị "Đã kết nối").
- Task 2: trang `/login`, guard `RequireAuth`, `HomePage`, hook `useAuth`, API client login/me/logout.
- Task 3: trang `/forgot-password` (2 bước — nhập email → nhập OTP + mật khẩu mới), link "Quên mật khẩu?" từ `/login`, hook `useForgotPassword/useResetPassword`, API client `forgotPassword/resetPassword`. Test flow 2 bước (stub fetch).

**Đang làm dở**

- (không) — phần web của slice-0 (Task 1-3) hoàn tất.

**Bước tiếp theo**

- Kiểm tra end-to-end `/forgot-password` với backend + Postgres thật; chuẩn bị PR slice-0 vào `dev`.

## Bàn giao phiên (điền khi dừng giữa chừng, dùng mẫu docs/ai-workflow/templates/session-handoff.md)

### 2026-09-27 — slice-4

**Đã xong**

- Thêm route học viên `/exams`, link từ trang chủ, danh sách đề đang mở.
- Thêm luồng start/resume, hiển thị câu hỏi student-safe, lưu đáp án trong state, đếm ngược và nộp bài.
- Hết giờ tự động nộp; lượt đã nộp không hiện nút nộp lại.
- Thêm test UI cho nộp thủ công, tự nộp khi hết giờ và trạng thái đã nộp.

**Bước tiếp theo**

- CI guard đã xanh trên `ca45ef8`; review lại PR #6 đúng HEAD bằng identity độc lập.
