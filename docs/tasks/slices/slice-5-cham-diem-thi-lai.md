# Slice/Task slice-5 — Cham diem tu dong & Thi lai

- Co che: Doc
- Owner hien tai: An Vo (agent thuc thi theo yeu cau owner 2026-11-04)
- Nhanh: feature/slice-5-cham-diem-thi-lai (stack tren feature/slice-4-tao-de-thi-online, PR #6)
- PR: xem MVP-BACKLOG (base `dev`, phu thuoc PR #6)
- Trang thai: xem `../MVP-BACKLOG.md`
- Phu thuoc: slice-4
- Sua muc goc: de trong

## Muc tieu bam duoc / nghiem thu duoc

Bai thi duoc cham diem tu dong, xac dinh dat/khong dat theo nguong, va tu dong tao luot thi lai voi de moi khi khong dat.

## Task

| # | Task | Tang | Ghi chu |
| --- | --- | --- | --- |
| 1 | Cham tu dong cau trac nghiem/dien tu theo dap an chuan | api service `gradeAttempt` | Xong. MC chap nhan chu cai (a/b/...) hoac noi dung lua chon; fill_blank chap nhan nhieu dap an `a\|b`, bo qua hoa/thuong & khoang trang. Speaking/Writing -> `pending_manual` (slice-9) |
| 2 | Logic pass/fail theo nguong diem, nguong cau hinh duoc theo tung cap do/khoa hoc | db `exam_grading_policies` + `exams.pass_percent` | Xong. Policy theo cap do (Admin `PUT /api/exam-policies/:level`), de thi co the ghi de; de copy policy luc tao (snapshot) |
| 3 | Tu dong tao luot thi lai (de moi random, gioi han so lan toi da, thoi gian cho giua cac lan) khi khong dat | api `startAttempt` | Xong. Truot -> `retake.available`; bat dau lan N+1 voi de random tranh de lan truoc; chan `retake_limit_reached`, `retake_cooldown`, `already_passed`, `closed` |
| 4 | Luu lich su tat ca luot thi (de, diem, thoi gian, so lan thi lai) de audit | `exam_attempts` | Xong. `attempt_number` unique, diem/ket qua bat bien (trigger `protect_exam_grade`); `GET /api/exams/:id/history` (hoc vien), `GET /api/exams/:id/results` (Admin/Teacher) |

## Stub cho phep

Cham diem Speaking/Writing ban tu dong qua UI giao vien — de o slice-9.

## Khong duoc stub

Logic pass/fail va gioi han so lan thi lai toi da phai la thuc, khong duoc bo qua.

## No ky thuat

| Marker | Vi tri | Noi dung | Du kien tra |
| --- | --- | --- | --- |
| TODO(slice-9) | Cham diem | Cau tu luan/speaking chua cham ban tu dong qua UI; bai co cau nay o trang thai `pending_manual`, khong mo thi lai | slice-9 |

## Nhat ky thay doi pham vi cua rieng Slice/Task nay

| Ngay | Loai | Noi dung | Ly do | ADR |
| --- | --- | --- | --- | --- |
| 2026-11-04 | Lam ro | "Tu dong tao luot thi lai" = he thong tu mo quyen thi lai va tao lan moi (de moi) khi hoc vien bam "Thi lai"; khong tao truoc row rong | Tranh deadline chay khi hoc vien chua bat dau | ADR-0003 |
| 2026-11-04 | Lam ro | Nguong cau hinh theo cap do (level); de thi ghi de tuy chon. Theo khoa hoc chua co vi chua co bang course | Schema hien tai chua co course | ADR-0003 |

## Cach nghiem thu

Hoc vien thi khong dat, he thong tu tao luot thi lai voi de khac; thi lai dat diem tren nguong, he thong bao dat va khong tao them luot thi lai.

## Kiem chung (2026-11-04)

- `pnpm -r test`, `pnpm -r lint`, `pnpm -r typecheck`, `pnpm -r build` PASS tren worktree slice5 (log `.agent-worktrees/logs/s5-*.log`).
- Integration Postgres 18 that (`lms_slice4_test`): truot -> lan 2 de khac, attempt_number [1,2], update diem bi trigger chan, insert trung attempt_number bi unique chan.
- Migration `20261104000000_exam_grading_retakes.sql` up/down/up OK (dbmate 2.35.1).

## Ban giao phien gan nhat

- Da xong: Task 1-4 (api, db, shared, web ket qua/thi lai), ADR-0003, test.
- Dang do: review doc lap PR #6 (slice-4) va PR slice-5; nghiem thu tay tren trinh duyet.
- Buoc tiep: merge PR #6 truoc, sau do rebase/merge PR slice-5 vao `dev`.
