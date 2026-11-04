# Slice/Task slice-9a — Cham tay Speaking/Writing (giao dien giao vien)

- Co che: Doc
- Owner hien tai: An Vo
- Nhanh: feature/slice-9a-cham-tay
- PR: xem `../MVP-BACKLOG.md`
- Trang thai: xem `../MVP-BACKLOG.md`
- Phu thuoc: slice-5, slice-10
- Sua muc goc: slice-9 (task 1)

## Muc tieu bam duoc / nghiem thu duoc

Giao vien/Admin mo trang "Cham bai", thay cac bai Speaking/Writing hoc vien da nop, doc cau tra loi, nhap diem tung cau + nhan xet va luu mot lan; hoc vien mo lai de thi thay diem, Dat/Chua dat, nhan xet va (neu truot) nut thi lai.

## Task

| # | Task | Tang | Ghi chu |
| --- | --- | --- | --- |
| 1 | Cot `graded_by`, `grader_feedback` cho `exam_attempts`; trigger chan sua 2 cot sau khi cham | DB | `20261110000000_manual_grading.sql`, ADR 0009 |
| 2 | Hang cho cham, mo bai, luu diem (moi cau 0..diem toi da, dung nguong dat da dong bang cua de) | API | `GET /grading/attempts`, `GET /grading/attempts/:id`, `POST /grading/attempts/:id/grade` (Admin/GV) |
| 3 | Bai qua gio chua nop van vao hang cho, duoc chot tu checkpoint khi mo | API | Giong luong het gio phia hoc vien |
| 4 | Trang `/grading` "Cham bai" trong AppShell (Admin/GV) | Web | `features/grading/` |
| 5 | Hoc vien thay "Nhan xet cua giao vien" trong ket qua | Web | `ExamsPage` `AttemptOutcome` |

## Stub cho phep

Khong co. Thong bao cho hoc vien khi co diem thuoc slice-9b.

## Khong duoc stub

Diem luu that vao Postgres qua trigger ghi-mot-lan; RBAC that (hoc vien 403).

## No ky thuat

| Marker | Vi tri | Noi dung | Du kien tra |
| --- | --- | --- | --- |
| — | ADR 0009 | Chua co cham lai/sua diem; GV thay bai moi co so (de chua gan lop) | Khi product can |

## Nhat ky thay doi pham vi cua rieng Slice/Task nay

| Ngay | Loai | Noi dung | Ly do | ADR |
| --- | --- | --- | --- | --- |
| 2026-11-10 | Them | Tach tu slice-9 task 1, owner yeu cau lam | slice-9 bi hoan, owner mo lai | 0009 |

## Cach nghiem thu

Hoc vien lam de Writing/Speaking va nop -> GV vao "Cham bai" thay bai, nhap diem + nhan xet, luu -> bai bien khoi hang cho; hoc vien mo lai de thay diem, nhan xet; truot thi co nut thi lai. Cham lai lan 2 bi tu choi.

Da kiem: api `service.test.ts` (hang cho -> cham -> hoc vien thay diem + nhan xet; cham lai bi chan; diem vuot/thieu/thua cau bi tu choi; truot -> thi lai; dang lam -> in_progress; het gio -> chot bai; de tu cham -> not_manual), `routes.test.ts` (403/404/400), `store.integration.test.ts` tren Postgres that (hang cho, ghi mot lan, trigger chan sua nhan xet); web `GradingPage.test.tsx`, `ExamsPage.test.tsx` (nhan xet). Migration up -> down -> up tren DB test. Mutation (bo kiem tra diem vuot diem toi da -> 1 test do).

## Ban giao phien gan nhat

Dien theo mau `../../ai-workflow/templates/session-handoff.md` khi dung giua chung.
