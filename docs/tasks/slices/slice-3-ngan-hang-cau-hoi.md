# Slice/Task slice-3 — Ngan hang cau hoi theo cap do (Starter/Mover/Flyer) + import

- Co che: Doc
- Owner hien tai: ...
- Nhanh: ...
- PR: ...
- Trang thai: xem `../MVP-BACKLOG.md`
- Phu thuoc: slice-1
- Sua muc goc: de trong

## Muc tieu bam duoc / nghiem thu duoc

Admin/Giao vien tao/sua cau hoi thu cong hoac import hang loat tu Excel/CSV dung theo mot dinh dang chuan (Question Import Schema), phan loai theo Level/Skill/Difficulty.

## Task

| # | Task | Tang | Ghi chu |
| --- | --- | --- | --- |
| 1 | Dinh nghia Question Import Schema chuan: level, skill, question_type, difficulty, question_text, options, correct_answer, points, explanation, source_reference | - | Dung chung cho import thu cong VA import tu AI o slice-4.5 |
| 2 | CRUD cau hoi theo Level/Skill/Difficulty/Type qua UI | - | - |
| 3 | Import hang loat tu Excel/CSV theo dung schema + validate (bao loi ro rang khi sai field/enum) | - | - |

## Stub cho phep

Chua can ho tro audio (Listening) va ghi am (Speaking) ngay — danh dau TODO(slice-9) cho phan nay.

## Khong duoc stub

Validate schema khi import phai la thuc, khong duoc import du lieu sai dinh dang ma khong bao loi.

## No ky thuat

| Marker | Vi tri | Noi dung | Du kien tra |
| --- | --- | --- | --- |
| TODO(slice-9) | Question model | Chua ho tro audio/ghi am cho Listening/Speaking | slice-9 |

## Nhat ky thay doi pham vi cua rieng Slice/Task nay

| Ngay | Loai | Noi dung | Ly do | ADR |
| --- | --- | --- | --- | --- |

## Cach nghiem thu

Import 1 file Excel dung schema thanh cong; import 1 file sai field bi bao loi ro va khong luu vao ngan hang.

## Ban giao phien gan nhat

Dien theo mau `../../ai-workflow/templates/session-handoff.md` khi dung giua chung.
