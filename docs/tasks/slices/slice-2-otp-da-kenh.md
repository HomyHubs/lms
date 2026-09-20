# Slice/Task slice-2 — OTP da kenh (WhatsApp/Telegram) cho doi/khoi phuc mat khau

- Co che: Doc
- Owner hien tai: ...
- Nhanh: ...
- PR: ...
- Trang thai: xem `../MVP-BACKLOG.md`
- Phu thuoc: slice-1
- Sua muc goc: de trong

## Muc tieu bam duoc / nghiem thu duoc

Hoc vien/giao vien chon kenh nhan OTP (WhatsApp, Telegram, hoac Email da co tu slice-0) de doi/khoi phuc mat khau.

## Task

| # | Task | Tang | Ghi chu |
| --- | --- | --- | --- |
| 1 | Tich hop WhatsApp Business API gui OTP | - | Can tai khoan doanh nghiep da duyet (xem cau hoi mo trong trang LMS) |
| 2 | Tich hop Telegram Bot API gui OTP | - | - |
| 3 | Giao dien chon kenh nhan OTP (WhatsApp/Telegram/Email) + luong doi/khoi phuc mat khau dung chung ca 3 kenh | - | Thiet ke provider-agnostic de de them kenh sau |

## Stub cho phep

Khong stub gui OTP that — phai goi API thuc cua provider (co the dung sandbox/test credentials trong moi truong dev).

## Khong duoc stub

Rate limit cho endpoint OTP/login (chong brute-force) phai la thuc.

## No ky thuat

| Marker | Vi tri | Noi dung | Du kien tra |
| --- | --- | --- | --- |
| TODO(slice-2) | apps/api/src/features/auth/whatsapp.ts, telegram.ts | Chua nghiem thu gui OTP that qua provider (can credentials sandbox) | Khi co credentials WhatsApp/Telegram |
| TODO(slice-2) | db/migrations/20260920000000_otp_channel_field.sql | Chua chay dbmate migrate + test rollback tren Postgres that | Truoc khi merge vao dev |

## Nhat ky thay doi pham vi cua rieng Slice/Task nay

| Ngay | Loai | Noi dung | Ly do | ADR |
| --- | --- | --- | --- | --- |
| 2026-09-21 | Them | Cot `channel` (password_reset_otps) + field `channel`/`recipient` trong ForgotPasswordRequest | Ho tro OTP da kenh (WhatsApp/Telegram), thiet ke provider-agnostic | 0001 |

## Cach nghiem thu

Yeu cau doi mat khau, chon kenh Telegram, nhan OTP thuc qua Telegram Bot, nhap dung va doi mat khau thanh cong; lap lai voi WhatsApp.

## Ban giao phien gan nhat

- Ngay: 2026-09-21
- Trang thai: code + test xong cuc bo, cong gac xanh (shared 14 / api 82 / web 11). Chua mo PR.
- Da xong: contract (OtpChannel + ForgotPasswordRequest.channel/recipient); dispatcher provider-agnostic (channels.ts); sender email/whatsapp/telegram; luu channel xuong DB (migration additive 20260920000000, co migrate:down); routes.ts + app.ts wiring; index.ts export; UI chon kenh o ForgotPasswordPage; test cho dispatcher + service + route + trang; ADR 0001; .env.example.
- Con lai: mo PR vao dev; chay dbmate migrate + test rollback tren Postgres that; nghiem thu thu cong gui OTP that qua WhatsApp/Telegram (can credentials).
- Phu thuoc: slice-1 dang Review (PR #3) chua merge — bat dau slice-2 tuan tu theo yeu cau nguoi dung; can rebase len dev sau khi slice-1 merge.
