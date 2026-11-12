# Slice/Task slice-7 — Xep loai hoc vien & Dashboard Admin

- Co che: Doc
- Owner hien tai: ...
- Nhanh: ...
- PR: ...
- Trang thai: xem `../MVP-BACKLOG.md`
- Phu thuoc: slice-5, slice-6
- Sua muc goc: de trong

## Muc tieu bam duoc / nghiem thu duoc

Admin xem duoc dashboard tong quan diem, bang xep hang hoc vien, va xep loai hoc vien tu dong tinh tu diem thi + chuyen can.

## Task

| # | Task | Tang | Ghi chu |
| --- | --- | --- | --- |
| 1 | Cong thuc xep loai (diem thi + ty le chuyen can), cau hinh duoc theo tung cap do | - | Trong so da chot: diem thi 90% + chuyen can 10%; phai cau hinh doi duoc ve sau |
| 2 | Dashboard bieu do diem, ty le dat/khong dat theo lop/cap do/thoi gian | - | - |
| 3 | Bang xep hang hoc vien + theo doi tien do thi lai | - | - |
| 4 | Export bao cao Excel/PDF | - | - |
| 5 | Nguong Dau/Rot cau hinh theo cap do (pass_min), chi Admin sua | - | Xong. `passMin` 0-100 tren diem tong; Dau khi final >= passMin; cot Dau/Rot + pie Dau/Rot + cot Excel; commit be1ea9c tren `dev` |

## Stub cho phep

Bieu do co the dung thu vien co san, khong can tu ve tu dau.

## Khong duoc stub

Du lieu dashboard va xep loai phai la du lieu thuc, chi tinh trong pham vi Branch Admin duoc gan (theo slice-1).

## No ky thuat

| Marker | Vi tri | Noi dung | Du kien tra |
| --- | --- | --- | --- |

## Nhat ky thay doi pham vi cua rieng Slice/Task nay

| Ngay | Loai | Noi dung | Ly do | ADR |
| --- | --- | --- | --- | --- |
| 2026-11-02 | Lam ro | Chot trong so xep loai: thi 90% + chuyen can 10%, cau hinh doi duoc ve sau | Quyet dinh chu so huu | - |
| 2026-11-09 | Them | Nguong Dau/Rot `pass_min` cau hinh theo cap do (0-100), mac dinh 50; Dau khi diem tong >= pass_min; chi Admin sua (giu guard `requireRole('admin')`, khong them role moi); them cot Dau/Rot va pie Dau/Rot vao dashboard + cot trong Excel; migration additive `20261116000000_student_grading_pass_min.sql`; commit be1ea9c tren `dev` (gates xanh) | Yeu cau chu so huu: Dau/Rot la settings theo diem, Admin lam duoc | - |
| 2026-11-10 | Sua | Lam lai chart dashboard: si so TUNG LOP nhom theo co so (moi lop 1 cot giu so rieng) | Yeu cau product: chart cu gop sai | — |

## Cach nghiem thu

Admin mo dashboard, thay dung so lieu diem/chuyen can cua Branch minh quan ly; xep loai hoc vien khop cong thuc da cau hinh; xuat duoc file bao cao.

## Ban giao phien gan nhat

Dien theo mau `../../ai-workflow/templates/session-handoff.md` khi dung giua chung.
