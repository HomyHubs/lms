# Slice/Task slice-6 — Diem danh

- Co che: Doc
- Owner hien tai: An Vo (agent)
- Nhanh: feature/slice-6-diem-danh
- PR: xem `../MVP-BACKLOG.md`
- Trang thai: xem `../MVP-BACKLOG.md`
- Phu thuoc: slice-1
- Sua muc goc: de trong

## Muc tieu bam duoc / nghiem thu duoc

Giao vien diem danh hoc vien theo tung buoi hoc; hoc vien/Admin xem lai lich su diem danh; he thong tinh ty le chuyen can.

## Task

| # | Task | Tang | Ghi chu |
| --- | --- | --- | --- |
| 1 | Giao vien diem danh theo buoi hoc (co mat/vang/tre/nghi co phep) cho lop minh day | DB + API + Web | Done — `class_teachers` (Admin gan GV), `class_sessions`, `attendance_records`; `POST /classes/:id/sessions`, `PUT /sessions/:id/attendance` chi GV phu trach |
| 2 | Hoc vien/Admin xem lai lich su diem danh | API + Web | Done — `GET /me/attendance` (hoc vien), `GET /attendance/students/:id` + `GET /sessions/:id/attendance` (Admin trong pham vi Branch) |
| 3 | Tinh ty le chuyen can (attendance rate) theo hoc vien/lop/khoa hoc | API + Web | Done — `GET /attendance/rates?classId|courseId|studentId`; cong thuc o ADR 0004. Dung lam dau vao cho xep loai o slice-7 |

## Stub cho phep

Chua can thong bao tu dong nhac diem danh — de o slice-9.

## Khong duoc stub

Diem danh chi cho giao vien dung lop do thuc hien (theo phan quyen slice-1).

## No ky thuat

| Marker | Vi tri | Noi dung | Du kien tra |
| --- | --- | --- | --- |

## Nhat ky thay doi pham vi cua rieng Slice/Task nay

| Ngay | Loai | Noi dung | Ly do | ADR |
| --- | --- | --- | --- | --- |
| 2026-11-05 | Bo sung | Them bang `class_teachers` + man hinh Admin gan giao vien cho lop | Schema slice-1 chua co lien ket GV-lop, can de thuc thi "chi GV dung lop" | 0004 |

## Cach nghiem thu

Giao vien diem danh 1 buoi cho lop minh day; Admin xem duoc lich su diem danh va ty le chuyen can dung.

## Ban giao phien gan nhat

Dien theo mau `../../ai-workflow/templates/session-handoff.md` khi dung giua chung.
