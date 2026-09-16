# AGENTS.md — apps/web (frontend React)

Nhật ký này thuộc riêng feature/nhánh này. Cập nhật liên tục, tối thiểu mỗi ngày làm việc.

## Bối cảnh feature

- Nhiệm vụ: Frontend React 19 + Vite + TypeScript. Slice-0 hiển thị trạng thái kết nối Database lấy từ backend health-check thật.
- Slice/Task đang triển khai: slice-0, xem `docs/tasks/slices/slice-0-nen-tang-auth.md`
- Phụ thuộc module nào, qua cửa công khai nào: `@lms/shared` (`HealthResponse`); gọi API qua proxy `/api` (vite.config.ts).
- Profile UI: **B — Tailwind CSS + shadcn/ui + lucide-react** (chốt tại slice-0, xem webapp-template mục 8). KHÔNG trộn MUI.
- Owner hiện tại: An Vo
- Nhánh: feature/slice-0-nen-tang-auth

## Contract (cửa công khai — chốt trước, không đổi giữa chừng)

- `fetchHealth()` → `HealthResponse`: gọi `/api/health`, validate bằng Zod schema dùng chung.
- Component `App`: router (`/login`, `/forgot-password` công khai; `/` được `RequireAuth` bảo vệ).
- API client (`src/lib/api.ts`): `login/fetchMe/logout`, `forgotPassword/resetPassword`; `ApiError`.
- Hook `useAuth`: `useSession/useLogin/useLogout/useForgotPassword/useResetPassword`.
- `cn(...)` (src/lib/utils.ts): helper className chuẩn shadcn.

## Nhật ký liên tục (thêm mục mới mỗi ngày, không ghi đè mục cũ)

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
