# Slice/Task slice-7 — Xep loai hoc vien & Dashboard Admin

- Co che: Doc
- Owner hien tai: An Vo
- Nhanh: feature/slice-7-xep-loai-dashboard
- PR: xem `../MVP-BACKLOG.md`
- Trang thai: xem `../MVP-BACKLOG.md`
- Phu thuoc: slice-5, slice-6
- Sua muc goc: de trong

## Muc tieu bam duoc / nghiem thu duoc

Admin xem duoc dashboard tong quan diem, bang xep hang hoc vien, va xep loai hoc vien tu dong tinh tu diem thi + chuyen can.

## Task

| # | Task | Tang | Ghi chu |
| --- | --- | --- | --- |
| 1 | Cong thuc xep loai (diem thi + ty le chuyen can), cau hinh duoc theo tung cap do | DB + API + Web | Bang `student_grading_policies` (mac dinh 90/10, Gioi>=85/Kha>=70/TB>=50); `GET/PUT /reports/classification-policies` |
| 2 | Dashboard bieu do diem, ty le dat/khong dat theo lop/cap do/thoi gian | API + Web | `GET /reports/students` (loc co so/cap do/lop/tu-den ngay); bieu do thanh CSS |
| 3 | Bang xep hang hoc vien + theo doi tien do thi lai | API + Web | Hang canh tranh theo diem tong; so luot thi lai + so de cho thi lai |
| 4 | Export bao cao Excel/PDF | Web | Excel tao tren trinh duyet (fflate, 4 sheet); PDF qua ban in `window.print()` |

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
| 2026-11-07 | Lam ro | Xep loai theo tung ghi danh (hoc vien trong lop); khong co diem danh -> chi tinh diem thi; chua co bai thi -> chua xep loai; PDF qua ban in trinh duyet, khong them thu vien | Giu du lieu that, khong them phu thuoc | 0006 |

## Cach nghiem thu

Admin mo dashboard, thay dung so lieu diem/chuyen can cua Branch minh quan ly; xep loai hoc vien khop cong thuc da cau hinh; xuat duoc file bao cao.

Da kiem: api `reports/service.test.ts` (cong thuc, nguong, xep hang, thi lai), `reports/routes.test.ts` (chi admin, chi co so duoc gan, doi cau hinh cap do -> xep loai doi theo), `reports/store.integration.test.ts` (Postgres that: bai thi + diem danh that theo co so, loc tu-den ngay); web `ReportsPage.test.tsx` (loc co so, chan cau hinh sai, file XLSX doc lai bang read-excel-file); migration down -> up.

## Ban giao phien gan nhat

Dien theo mau `../../ai-workflow/templates/session-handoff.md` khi dung giua chung.
