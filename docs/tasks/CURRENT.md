# Task hiện tại (chỉ dùng khi làm tuần tự một mình)

Phạm vi sử dụng: CHỈ áp dụng khi đúng một người hoặc một agent làm việc, không có ai khác chạy song song trên repo này. Ngay khi có dev/agent thứ hai bắt đầu làm song song, ngừng cập nhật file này và chuyển hẳn sang dùng `MVP-BACKLOG.md` (cột Owner) và `AGENTS.md` của từng feature.

## Đang làm

- ID Slice/Task: slice-0 (Nền tảng & Auth) — Task 3 (quên mật khẩu qua OTP Email)
- Cập nhật ngày: 2026-09-14
- Mô tả phạm vi: Quên mật khẩu qua OTP gửi Email (TTL ngắn 10 phút, hash SHA-256, rate limit endpoint, giới hạn số lần nhập sai). Chỉ kênh Email; WhatsApp/Telegram để slice-2.
- Nhánh làm việc: feature/slice-0-nen-tang-auth

## Đã làm trong phiên gần nhất

- Task 2 đã commit (`5a08c7d`): đăng nhập SĐT + mật khẩu, phiên Session opaque.
- Task 3 (quên mật khẩu qua OTP Email):
  - DB: migration `20260914015000_users_add_email.sql` (thêm cột `email` nullable, unique khi có — additive) và `20260914020000_password_reset_otps.sql` (bảng OTP: `otp_hash` SHA-256, `attempts`, `consumed_at`, `expires_at`; đảo ngược được).
  - Shared: contract `ForgotPasswordRequest`, `ResetPasswordRequest`, `Email`, `OtpCode`, `OkResponse` (Zod) + test.
  - Backend (`apps/api/src/features/auth`): `password-reset.ts` (sinh OTP 6 số qua crypto, hash SHA-256, `requestPasswordReset` im lặng chống liệt kê tài khoản, `resetPassword` kiểm tra hết hạn/số lần sai/one-time), `email.ts` (sender dev log — TODO provider thật), store `makePasswordResetStore` (Kysely), routes `POST /auth/forgot-password` (rate limit 3/phút) + `POST /auth/reset-password` (rate limit 5/phút); seed thêm email.
  - Frontend (`apps/web`): trang `/forgot-password` (2 bước: nhập email → nhập OTP + mật khẩu mới), link "Quên mật khẩu?" từ `/login`, hook `useForgotPassword/useResetPassword`, API client `forgotPassword/resetPassword`.

## Đang làm dở / còn thiếu

- Chưa chạy `dbmate migrate` và seed trên Postgres thật trong phiên này (Docker/Postgres không chạy ở môi trường hiện tại). Migration là SQL thật, cần chạy khi có DB.
- Email OTP hiện chỉ log ra console ở dev; cần cắm provider email thật (TODO trong `email.ts`).

## Cổng gác đã chạy

- Task 2: lint 4/4, typecheck 5/5, test 29 pass. Task 3: sẽ chạy lại đầy đủ trước khi commit.

## Bước tiếp theo

1. Chạy cổng gác đầy đủ cho Task 3 rồi commit trên nhánh `feature/slice-0-nen-tang-auth`.
2. Với Postgres thật: `pnpm --filter @lms/db migrate` rồi seed admin, kiểm tra end-to-end `/login` và `/forgot-password`.
3. Slice-0 hoàn tất 3 task → chuẩn bị PR vào `dev` (cập nhật MVP-BACKLOG sang Review).

## Bàn giao phiên (nếu dừng giữa chừng)

Điền theo mẫu `../ai-workflow/templates/session-handoff.md`.
