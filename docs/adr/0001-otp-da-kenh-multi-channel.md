# ADR 0001 — OTP đa kênh (Email/WhatsApp/Telegram) cho đổi/khôi phục mật khẩu

- Trạng thái: Accepted
- Ngày: 2026-09-21
- Slice liên quan: slice-2 (`docs/tasks/slices/slice-2-otp-da-kenh.md`)

## Bối cảnh

Slice-0 chỉ gửi OTP đặt lại mật khẩu qua Email. Slice-2 yêu cầu cho người dùng chọn
kênh nhận OTP: Email, WhatsApp hoặc Telegram, và thiết kế phải "provider-agnostic" để
dễ thêm kênh sau. Thay đổi này chạm tới cả schema (bảng `password_reset_otps`) lẫn
contract dùng chung FE-BE (`ForgotPasswordRequest`), nên bắt buộc ghi ADR theo
`AGENTS.md` mục 18 và 22.3.

## Quyết định

1. **Dispatcher provider-agnostic.** Thêm `OtpDispatcher` (`apps/api/src/features/auth/channels.ts`).
   `makeOtpDispatcher(emailSender, whatsappSender, telegramSender, logger)` chọn sender
   theo `channel` và ánh xạ `recipient` sang địa chỉ đúng kênh (email / phone / chat_id).
   Thêm kênh mới = thêm một sender + một nhánh `case`, không đổi tầng service/route.
2. **Sender đọc secret trực tiếp từ `process.env`** (giữ nguyên pattern của `email.ts`
   ở slice-0), không đi qua `config.ts`. Thiếu cấu hình: Email fallback ra console (dev),
   WhatsApp/Telegram ném lỗi rõ ràng khi gọi thật. `.env.example` liệt kê biến (giá trị trống).
3. **Contract (additive).** `@lms/shared`: thêm enum `OtpChannel` và mở rộng
   `ForgotPasswordRequest` với `channel` (mặc định `'email'`) + `recipient`
   (bắt buộc khi `channel ≠ email`, kiểm bằng `.refine`). Không phá vỡ client cũ:
   thiếu `channel` mặc định về `'email'` như hành vi slice-0.
4. **Schema (additive, đảo ngược được).** Migration
   `db/migrations/20260920000000_otp_channel_field.sql` thêm cột `channel varchar(20)
   not null default 'email'`, kèm `migrate:down` (drop column). Bản ghi cũ nhận default
   `'email'`.

## Hệ quả

- Tích cực: dễ mở rộng kênh; tương thích ngược; secret không rời khỏi runtime; lưu
  `channel` giúp truy vết/thống kê kênh gửi.
- Đánh đổi: mỗi sender phụ thuộc API provider ngoài (WhatsApp Cloud API, Telegram Bot
  API); nghiệm thu thật cần credentials sandbox. Rate limit endpoint OTP giữ nguyên
  (thật, không stub) theo yêu cầu slice.
- Phụ thuộc: slice-2 dựa trên slice-1 (đang Review); cần rebase lên `dev` sau khi
  slice-1 merge.
