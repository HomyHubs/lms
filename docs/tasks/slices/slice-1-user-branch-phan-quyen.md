# Slice/Task slice-1 — Quan ly nguoi dung, co so (Branch) & phan quyen

- Co che: Doc
- Owner hien tai: —
- Nhanh: feature/slice-1-user-branch-phan-quyen
- PR: 3
- Trang thai: Done — da merge vao `dev`
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
| ~~TODO(slice-1)~~ | `apps/api/src/platform/db.ts` (`UsersTable.role`) | ~~Thay `role` text bang lien ket Branch/role day du~~ → **da tra 2026-11-27 (ADR 0021)**: `role` duoc go kieu `UserRole` o ca Kysely lan `UserRecord` (bo cast trong `toPublicUser`); quyen chuyen sang ma tran `ROLE_PERMISSIONS` + `can()` trong `@lms/shared`; luat superadmin gom ve `isAllowed` va `branchScopeOf` | Da tra |

## Nhat ky thay doi pham vi cua rieng Slice/Task nay

| Ngay | Loai | Noi dung | Ly do | ADR |
| --- | --- | --- | --- | --- |
| 2026-11-27 | Mo rong | Quyen chuyen tu danh sach role tai tung route sang ma tran `ROLE_PERMISSIONS` trong `@lms/shared` + `rbac.requirePermission`; `role` duoc go kieu `UserRole`; luat superadmin gom ve `isAllowed`/`branchScopeOf`; `users/routes.ts` bo guard tu viet | Tra `TODO(slice-1)`; giam 30 cho khai bao quyen va 6 ban sao luat superadmin xuong mot nguon | 0021 |
| 2026-11-10 | Sua | Them role 'superadmin' (cao nhat, vuot moi branch-scope, la role duy nhat quan ly tai khoan admin/superadmin va duy nhat duoc export danh sach hoc vien); admin thuong KHONG con export duoc | Yeu cau product: tach quyen quan tri cap cao + chong ro ri danh sach hoc vien | — |

## Cach nghiem thu

Tao 2 Branch, gan Admin A chi vao Branch 1, Admin B vao ca 2 Branch; xac nhan Admin A khong thay du lieu cua Branch 2, Admin B thay ca hai.

## Ban giao phien gan nhat

- Da merge vao `dev` qua PR #3, commit `7e6dfc4`.
- Khong con Owner; trang thai chinh thuc: Done.
