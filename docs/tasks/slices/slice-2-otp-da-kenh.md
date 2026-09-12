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

## Nhat ky thay doi pham vi cua rieng Slice/Task nay

| Ngay | Loai | Noi dung | Ly do | ADR |
| --- | --- | --- | --- | --- |

## Cach nghiem thu

Yeu cau doi mat khau, chon kenh Telegram, nhan OTP thuc qua Telegram Bot, nhap dung va doi mat khau thanh cong; lap lai voi WhatsApp.

## Ban giao phien gan nhat

Dien theo mau `../../ai-workflow/templates/session-handoff.md` khi dung giua chung.
