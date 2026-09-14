# Slice/Task slice-0 — Nen tang & Auth (walking skeleton + dang nhap SDT + quen mat khau qua Email)

- Co che: Doc
- Owner hien tai: An Vo
- Nhanh: feature/slice-0-nen-tang-auth
- PR: ...
- Trang thai: xem `../MVP-BACKLOG.md` (nguon trang thai duy nhat)
- Phu thuoc: khong co
- Sua muc goc: de trong

## Muc tieu bam duoc / nghiem thu duoc

Mot man hinh chay duoc di xuyen suot frontend, backend, database (health-check hien thi trang thai ket noi database), VA nguoi dung dang nhap duoc bang so dien thoai (SDT) + mat khau, lay lai mat khau qua OTP gui Email.

## Task

| # | Task | Tang | Ghi chu |
| --- | --- | --- | --- |
| 1 | Dung khung monorepo (theo `docs/methodology/webapp-template.md`), CI co ban, endpoint health-check noi thong FE-BE-DB thuc | - | Khong mock ket noi database |
| 2 | Dang nhap bang SDT + mat khau (hash bcrypt/argon2), JWT/session, rate limit endpoint login | - | Bang `User` toi thieu: id, phone_number, password_hash, role |
| 3 | Quen mat khau qua OTP gui Email (kenh don gian nhat truoc, WhatsApp/Telegram lam sau o slice-2) | - | OTP co TTL ngan, rate limit |

## Stub cho phep

Giao dien toi thieu, chua can style. Chua can Branch/role chi tiet (se lam o slice-1) — tam thoi 1 role duy nhat hoac gia dinh Admin.

## Khong duoc stub

Ket noi database phai la thuc, khong mock. Hash mat khau va OTP phai la co che thuc (khong luu plain text).

## No ky thuat

| Marker | Vi tri | Noi dung | Du kien tra |
| --- | --- | --- | --- |
| TODO(slice-1) | User model | Chua co Branch/role day du, se bo sung o slice-1 | slice-1 |
| TODO(slice-2) | Forgot password | Chua co kenh WhatsApp/Telegram, chi co Email | slice-2 |

## Nhat ky thay doi pham vi cua rieng Slice/Task nay

| Ngay | Loai | Noi dung | Ly do | ADR |
| --- | --- | --- | --- | --- |
| 2026-09-12 | Mo rong pham vi | Gop walking skeleton (slice-0 goc cua template) voi Auth dau tien theo ke hoach trong trang Notion LMS | Ke hoach LMS gop 2 viec nay vao chung mot slice dau | - |
| 2026-09-14 | Quyet dinh ky thuat | Task 2 dung "Session opaque" (token ngau nhien + bang `sessions`, cookie HttpOnly) thay vi JWT | Theo stack chuan webapp-template ("Xac thuc = Session opaque"); task cho phep "JWT/session" | - |

## Cach nghiem thu

Mo trang, thay trang thai ket noi database thuc tra ve tu backend thuc; dang nhap duoc bang SDT + mat khau da tao; bam "quen mat khau" nhan duoc OTP qua Email va doi mat khau thanh cong.

## Ban giao phien gan nhat

Dien theo mau `../../ai-workflow/templates/session-handoff.md` khi dung giua chung.
