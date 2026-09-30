# Slice/Task slice-2 — OTP da kenh (WhatsApp/Telegram) cho doi/khoi phuc mat khau

- Co che: Doc
- Owner hien tai: —
- Nhanh: feature/slice-2-otp-da-kenh
- PR: 4
- Trang thai: Done (con no) — da merge vao `dev`
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
| TODO(slice-2) | db/migrations/20260920000000_otp_channel_field.sql | Chua chay dbmate migrate + test rollback tren Postgres that | Sau merge, truoc khi coi no ky thuat da tra |

## Nhat ky thay doi pham vi cua rieng Slice/Task nay

| Ngay | Loai | Noi dung | Ly do | ADR |
| --- | --- | --- | --- | --- |
| 2026-09-21 | Them | Cot `channel` (password_reset_otps) + field `channel`/`recipient` trong ForgotPasswordRequest | Ho tro OTP da kenh (WhatsApp/Telegram), thiet ke provider-agnostic | 0001 |

## Cach nghiem thu

Yeu cau doi mat khau, chon kenh Telegram, nhan OTP thuc qua Telegram Bot, nhap dung va doi mat khau thanh cong; lap lai voi WhatsApp.

## Ban giao phien gan nhat

- Ngay: 2026-09-27
- Trang thai: da merge vao `dev` qua PR #4, commit `992e478`; khong con Owner.
- Da xong: contract (OtpChannel + ForgotPasswordRequest.channel/recipient); dispatcher provider-agnostic; sender email/whatsapp/telegram; migration additive; API/UI/test va ADR 0001.
- No con lai: nghiem thu gui OTP that bang credentials sandbox WhatsApp/Telegram; chay migration + rollback tren PostgreSQL that.
