# Slice/Task slice-1 — Quan ly nguoi dung, co so (Branch) & phan quyen

- Co che: Doc
- Owner hien tai: An Vo
- Nhanh: feature/slice-1-user-branch-phan-quyen
- PR: ...
- Trang thai: xem `../MVP-BACKLOG.md`
- Phu thuoc: slice-0
- Sua muc goc: de trong

## Muc tieu bam duoc / nghiem thu duoc

Admin tao/sua/xoa User (Admin/Teacher/Student/Staff) voi role dung, tao Center + nhieu Branch (co so), tao Level/Course/Class/Enrollment, va gan 1 hoac nhieu Branch cho tung User — du lieu va menu chi hien thi trong pham vi Branch duoc gan.

## Task

| # | Task | Tang | Ghi chu |
| --- | --- | --- | --- |
| 1 | CRUD User (Admin/Teacher/Student/Staff) + RBAC theo role, thay the role gia dinh o slice-0 | - | Ap dung TODO(slice-1) tu slice-0 |
| 2 | Quan ly Center + Branch (co so): CRUD, 1 Center co nhieu Branch | - | Entity `Branch` |
| 3 | Quan ly Level (Starter/Mover/Flyer) + Course + Class + Enrollment, moi Class gan 1 Branch | - | - |
| 4 | Bang `UserBranch`: gan 1 hoac nhieu Branch cho User; loc du lieu/menu theo Branch duoc gan (branch-scoped access) | - | Ap dung cho ca Admin, Teacher, Student |

## Stub cho phep

Giao dien quan ly co the toi gian (bang danh sach + form), chua can UX toi uu.

## Khong duoc stub

Phan quyen theo role va theo Branch phai la thuc — khong duoc de mo (moi user thay het du lieu moi Branch).

## No ky thuat

| Marker | Vi tri | Noi dung | Du kien tra |
| --- | --- | --- | --- |

## Nhat ky thay doi pham vi cua rieng Slice/Task nay

| Ngay | Loai | Noi dung | Ly do | ADR |
| --- | --- | --- | --- | --- |

## Cach nghiem thu

Tao 2 Branch, gan Admin A chi vao Branch 1, Admin B vao ca 2 Branch; xac nhan Admin A khong thay du lieu cua Branch 2, Admin B thay ca hai.

## Ban giao phien gan nhat

Dien theo mau `../../ai-workflow/templates/session-handoff.md` khi dung giua chung.
