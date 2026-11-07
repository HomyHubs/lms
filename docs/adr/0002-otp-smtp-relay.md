# ADR 0002 — Gửi email qua SMTP relay cho OTP và thông báo

- Trạng thái: Accepted (chủ dự án chốt 2026-11-07) — chưa hiện thực
- Ngày: 2026-11-07
- Liên quan: ADR 0001 (`docs/adr/0001-otp-da-kenh-multi-channel.md`), ADR 0010 (`origin/dev:docs/adr/0010-notifications.md`), slice-2, slice-9b
- Ghi chú đánh số: số 0002 theo chuỗi ADR của bản lưu gốc; `origin/dev` đã có ADR 0002 khác, khi đồng bộ sang nguồn chuẩn đổi thành số tiếp theo để tránh trùng.

## Bối cảnh

`apps/api/src/features/auth/email.ts` trên `origin/dev` đang gửi OTP đặt lại mật khẩu qua Resend HTTP API (`RESEND_API_KEY`, `RESEND_FROM`); khi thiếu key thì `makeConsoleEmailSender` ném lỗi `Email delivery unavailable` chứ không log OTP. ADR 0010 (thông báo slice-9b) phát nhắc nhở qua `NOTIFY_CHANNEL` = whatsapp / telegram / console cùng chuông in-app, chưa có kênh email. `docs/tasks/HANDOFF-BY-CATEGORY.md` §G ở bản lưu gốc còn ghi nợ "cắm provider email thật cho OTP". Chủ dự án chốt dùng SMTP relay, không dùng API của nhà cung cấp email, cho cả thông báo lẫn reset mật khẩu tài khoản.

## Quyết định

1. Kênh gửi email duy nhất là **SMTP relay**. Bỏ adapter Resend; không dùng Google API, WhatsApp hay Telegram để gửi email. Cấu hình qua biến môi trường (host, port, user, password, From, TLS/STARTTLS) — tên biến chốt khi hiện thực và liệt kê đầy đủ trong `.env.example`; không commit secret.
2. Một adapter phục vụ hai luồng: (a) OTP đổi/khôi phục mật khẩu tài khoản (`password-reset`), (b) email thông báo — nhắc thi lại, nhắc buổi dạy, thông báo chung. Giữ nguyên chuông in-app của ADR 0010; email là kênh bổ sung, không thay thế.
3. Giữ thiết kế provider-agnostic của ADR 0001: chỉ thay `makeEmailSender` / `OtpEmailSender`, không đổi contract FE-BE (`ForgotPasswordRequest`, `OtpChannel`), không đổi schema `password_reset_otps`, không đổi rate limit (login 5/phút, forgot-password 3/phút, reset-password 5/phút).
4. Không log OTP hay PII. Thiếu cấu hình SMTP → từ chối gửi và trả lỗi rõ (giữ hành vi fail-closed hiện tại), không fallback im lặng sang console. Gửi thất bại có retry giới hạn kèm báo lỗi, không làm lộ mã.
5. Trước merge phải chạy test với SMTP server sandbox, xác nhận TLS, From, nội dung và retry; CI không gửi email thật.

## Hệ quả

- Tích cực: không phụ thuộc vendor API, dùng được relay nội bộ của trung tâm, một adapter cho cả OTP và thông báo, đổi relay sau này chỉ sửa một chỗ.
- Đánh đổi: phải quản lý credential SMTP và cấu hình SPF/DKIM/DMARC để thư không vào spam; cần cập nhật `.env.example`, `HANDOFF-BY-CATEGORY.md` §G ở nguồn chuẩn, và ADR 0010 nếu bổ sung `NOTIFY_CHANNEL=email`.
- Việc cần làm: hiện thực adapter SMTP trong `apps/api/src/features/auth/email.ts`, cập nhật `.env.example`, test gửi thật trên môi trường sandbox, rồi mở PR theo đúng 1 slice = 1 PR với review độc lập.
