# Task hiện tại (chỉ dùng khi làm tuần tự một mình)

Phạm vi sử dụng: CHỈ áp dụng khi đúng một người hoặc một agent làm việc, không có ai khác chạy song song trên repo này. Ngay khi có dev/agent thứ hai bắt đầu làm song song, ngừng cập nhật file này và chuyển hẳn sang dùng `MVP-BACKLOG.md` (cột Owner) và `AGENTS.md` của từng feature.

## Đang làm

- ID Slice/Task: slice-2 (OTP đa kênh — Email/WhatsApp/Telegram cho đổi/khôi phục mật khẩu)
- Cập nhật ngày: 2026-09-21
- Mô tả phạm vi: Cho người dùng chọn kênh nhận OTP (Email đã có từ slice-0, thêm WhatsApp + Telegram) trong luồng quên/đặt lại mật khẩu. Thiết kế provider-agnostic qua một `OtpDispatcher` để dễ thêm kênh sau. Chi tiết: `slices/slice-2-otp-da-kenh.md`.
- Nhánh làm việc: feature/slice-2-otp-da-kenh (base = `dev`)
- Trạng thái: code + test xong cục bộ, cổng gác xanh (shared 14 / api 82 / web 11). Chưa mở PR.
- Lưu ý phụ thuộc: slice-2 phụ thuộc slice-1; slice-1 hiện ở trạng thái Review (PR #3, chưa merge vào `dev`). Bắt đầu slice-2 khi slice-1 chưa Done là theo yêu cầu tiếp tục tuần tự của người dùng — cần rebase lên `dev` sau khi slice-1 merge (xem `../../AGENTS.md` mục 9 & 10).

## Đã làm trong phiên gần nhất

- **Contract (`@lms/shared`).** Thêm `OtpChannel` (email|whatsapp|telegram) và mở rộng `ForgotPasswordRequest` với `channel` (mặc định `'email'`) + `recipient` (bắt buộc khi channel ≠ email, qua `.refine`).
- **Sender theo kênh (API).** `email.ts` (Resend + console fallback), `whatsapp.ts` (WhatsApp Cloud API), `telegram.ts` (Telegram Bot API) — đều đọc secret trực tiếp từ `process.env`.
- **Dispatcher provider-agnostic.** `channels.ts` (`makeOtpDispatcher`) chọn sender theo `channel`, ánh xạ `recipient` → địa chỉ đúng kênh (email/phone/chatId).
- **Luồng end-to-end.** `password-reset.ts` nhận `channel`/`recipient`, lưu `channel` xuống DB và gửi qua dispatcher; `routes.ts` đọc field mới; `app.ts` dựng dispatcher với cả 3 sender; `index.ts` export contract công khai.
- **DB.** Migration `db/migrations/20260920000000_otp_channel_field.sql` (dbmate up/down, additive: thêm cột `channel` mặc định `'email'`); `platform/db.ts` + `store.ts` lưu `channel`.
- **Web.** `ForgotPasswordPage.tsx`: thêm ô chọn kênh + ô nhập recipient (hiện khi chọn WhatsApp/Telegram), gửi kèm `channel`/`recipient`.
- **Tài liệu.** Thêm ADR `docs/adr/0001-otp-da-kenh-multi-channel.md` (đổi schema + contract → bắt buộc ADR theo `../../AGENTS.md` mục 22.3).
- **`.env.example`.** Thêm biến `RESEND_*`, `WHATSAPP_*`, `TELEGRAM_*` (giá trị để trống).

## Đang làm dở / còn thiếu

- Chưa mở PR vào `dev`; chưa chạy quy trình review/auto-merge.
- Chưa chạy `dbmate migrate` + test rollback trên Postgres thật cho migration mới (kế thừa nợ slice-0/1: các migration chưa chạy trên DB thật).
- Nghiệm thu thủ công gửi OTP thật qua WhatsApp/Telegram (spec yêu cầu gọi API provider thật) cần credentials sandbox — chưa thực hiện.
- Slice-1 (phụ thuộc) chưa merge; cần rebase sau khi slice-1 vào `dev`.

## Cổng gác đã chạy

- `pnpm -r build && pnpm -r lint && pnpm -r typecheck && pnpm -r test` cục bộ — xanh (shared 14, api 82, web 11). Sẽ chạy lại đầy đủ trên CI trước khi merge.

## Bước tiếp theo

1. (Sau khi slice-1 merge) rebase `feature/slice-2-otp-da-kenh` lên `dev`, chạy lại cổng gác.
2. Chạy `dbmate migrate` + kiểm tra rollback (`migrate:down`) trên Postgres thật.
3. Nghiệm thu thủ công: chọn Telegram, nhận OTP thật, đặt lại mật khẩu; lặp lại với WhatsApp.
4. Mở PR vào `dev`, chạy review; sau khi Done cập nhật `MVP-BACKLOG.md` (Done, PR) + rollup `../../AGENTS.md`.

## Bàn giao phiên (nếu dừng giữa chừng)

Điền theo mẫu `../ai-workflow/templates/session-handoff.md`.
