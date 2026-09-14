# Task hiện tại (chỉ dùng khi làm tuần tự một mình)

Phạm vi sử dụng: CHỈ áp dụng khi đúng một người hoặc một agent làm việc, không có ai khác chạy song song trên repo này. Ngay khi có dev/agent thứ hai bắt đầu làm song song, ngừng cập nhật file này và chuyển hẳn sang dùng `MVP-BACKLOG.md` (cột Owner) và `AGENTS.md` của từng feature.

## Đang làm

- ID Slice/Task: slice-0 (Nền tảng & Auth) — Task 2 (đăng nhập SĐT + mật khẩu)
- Cập nhật ngày: 2026-09-14
- Mô tả phạm vi: Đăng nhập bằng số điện thoại + mật khẩu (hash bcrypt), phiên Session opaque, rate limit endpoint login.
- Nhánh làm việc: feature/slice-0-nen-tang-auth

## Đã làm trong phiên gần nhất

- DB: migration `20260914010000_users_auth.sql` tạo bảng `users` (phone_number unique, password_hash, role) và `sessions` (token_hash, user_id, expires_at). Đảo ngược được.
- Shared: contract `LoginRequest`, `LoginResponse`, `MeResponse`, `PublicUser`, `PhoneNumber` (Zod) + test.
- Backend (`apps/api/src/features/auth`): service (bcrypt hash/verify, tạo & giải phiên opaque, chống liệt kê tài khoản), store Kysely, routes `POST /auth/login` (rate limit 5/phút), `POST /auth/logout`, `GET /auth/me`; đăng ký `@fastify/cookie`; script `seed` tạo admin đầu tiên.
- Frontend (`apps/web`): thêm `react-router-dom`, trang `/login`, guard `RequireAuth`, `HomePage` (health-check + đăng xuất), hook `useAuth` (useSession/useLogin/useLogout), API client `login/fetchMe/logout`.
- Test: shared 9, api 17, web 3 — tất cả xanh.

## Đang làm dở / còn thiếu

- Chưa chạy `dbmate migrate` và seed trên Postgres thật trong phiên này (Docker/Postgres không chạy ở môi trường hiện tại). Migration là SQL thật, cần chạy khi có DB.
- Task 3 (quên mật khẩu qua OTP Email) chưa bắt đầu.

## Cổng gác đã chạy

- `pnpm run lint` — 4/4 package pass (--max-warnings=0).
- `pnpm run typecheck` — 5/5 pass.
- `pnpm run test` — 29 test pass (shared 9, api 17, web 3).

## Bước tiếp theo

1. Với Postgres thật: `pnpm --filter @lms/db migrate` rồi seed admin, kiểm tra đăng nhập end-to-end trên `/login`.
2. Làm Task 3: quên mật khẩu qua OTP gửi Email (bảng OTP TTL ngắn, rate limit).
3. Commit Task 2 trên nhánh `feature/slice-0-nen-tang-auth`.

## Bàn giao phiên (nếu dừng giữa chừng)

Điền theo mẫu `../ai-workflow/templates/session-handoff.md`.
