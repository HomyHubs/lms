# Slice/Task slice-8 — Ngay cong & gio day giao vien/nhan vien

- Co che: Doc
- Owner hien tai: An Vo
- Nhanh: feature/slice-8-ngay-cong-gio-day
- PR: xem `../MVP-BACKLOG.md`
- Trang thai: xem `../MVP-BACKLOG.md`
- Phu thuoc: slice-1, slice-6
- Sua muc goc: de trong

## Muc tieu bam duoc / nghiem thu duoc

Nhan vien duoc cham cong; gio day cua giao vien duoc tu dong tinh tu diem danh + lich day thuc te; co bao cao tong hop theo ky luong.

## Task

| # | Task | Tang | Ghi chu |
| --- | --- | --- | --- |
| 1 | Cham cong nhan vien (check-in/check-out hoac theo ca) | DB + API + Web | Bang `staff_shifts` (1 ca mo/nguoi); `POST /timesheet/check-in|check-out`, `GET /me/timesheet?month`; ngay cong = ngay dia phuong (Asia/Ho_Chi_Minh) co check-in, gio cong chi tinh ca da check-out |
| 2 | Tu dong tinh so buoi day, so gio len lop cua giao vien tu lich day + diem danh thuc te (chi tinh buoi da dien ra va giao vien co mat) | DB + API | Buoi "da day" = khong huy + co diem danh; GV day = nguoi ghi diem danh; `duration_minutes` (mac dinh 90) |
| 3 | Doi chieu lich day du kien vs thuc te (day bu, nghi, day the) | DB + API + Web | `planned_teacher_id`, `makeup_for_session_id`, `cancelled_at`; `POST /sessions/:id/cancel`; trang Diem danh co Thoi luong / Day bu cho buoi / Huy buoi |
| 4 | Bao cao tong hop gio cong theo thang/ky luong, xuat du lieu cho tinh luong | API + Web | `GET /reports/work-hours?month&branchId` (Admin, theo co so duoc gan); trang `/work-hours`, xuat Excel 3 sheet tren trinh duyet |

## Stub cho phep

Chua can tich hop truc tiep voi he thong tinh luong ben ngoai — chi can xuat file du lieu.

## Khong duoc stub

So gio day tinh tu diem danh thuc te phai la thuc, khong duoc tinh theo lich du kien don thuan (se sai khi giao vien nghi/day bu).

## No ky thuat

| Marker | Vi tri | Noi dung | Du kien tra |
| --- | --- | --- | --- |

## Nhat ky thay doi pham vi cua rieng Slice/Task nay

| Ngay | Loai | Noi dung | Ly do | ADR |
| --- | --- | --- | --- | --- |
| 2026-11-08 | Lam ro | GV theo lich = nguoi tao buoi; buoi bu chi thay buoi da huy/chua day cua cung lop va khong tinh vao "theo lich"; huy buoi chi khi chua diem danh; ky luong = thang dia phuong; chua co sua ca quen check-out | Tinh tu du lieu that, khong them bang lich rieng | 0007 |

## Cach nghiem thu

Giao vien day 3 buoi, nghi 1 buoi co day bu; bao cao gio day phan anh dung 3 buoi thuc te da day (khong tinh buoi nghi, co tinh buoi day bu).

Da kiem: api `workhours/service.test.ts` (kich ban nghiem thu: 2 buoi day + 1 huy + 1 bu -> da day 3, nghi 1, bu 1, 270 phut; day thay; ca lam), `workhours/routes.test.ts` (quyen, 409 ca mo, chi co so duoc gan), `workhours/store.integration.test.ts` (Postgres that qua store diem danh that; ranh gioi ngay dia phuong), `attendance/routes.test.ts` (huy buoi, buoi bu sai -> 400/409); web `WorkHoursPage.test.tsx` (check-in, bao cao Admin, sheet Excel); migration down -> up; mutation (tinh gio theo lich thay vi diem danh -> test do).

## Ban giao phien gan nhat

Dien theo mau `../../ai-workflow/templates/session-handoff.md` khi dung giua chung.
