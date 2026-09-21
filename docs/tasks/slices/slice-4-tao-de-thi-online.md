# Slice/Task slice-4 — Tao de & Thi online

- Co che: Doc
- Owner hien tai: An Vo
- Nhanh: feature/slice-4-tao-de-thi-online
- PR: (dien khi mo PR)
- Trang thai: xem `../MVP-BACKLOG.md`
- Phu thuoc: slice-3 (da Done — PR #5)
- Sua muc goc: de trong

## Muc tieu bam duoc / nghiem thu duoc

Hoc vien vao thi mot de duoc sinh tu ngan hang cau hoi (random theo Level+Skill+so luong), lam bai trong thoi gian gioi han, nop bai.

## Task

| # | Task | Tang | Ghi chu |
| --- | --- | --- | --- |
| 1 | Sinh de tu dong (random) tu ngan hang cau hoi theo Level + Skill + so luong; versioning de de tranh trung khi thi lai | shared/api | Sinh de la thuc: rut ngau nhien tu bank; neu de trung y het de gan nhat cua chinh hoc vien -> rut lai (khong cho 2 de giong nhau lien tiep) |
| 2 | Giao dien hoc vien lam bai thi: mo/dong theo lich duoc gan, gioi han thoi luong lam bai | api/web | Exam co cua so lich (opens_at/closes_at); moi luot thi co deadline = start + duration; dong ho dem nguoc o FE |
| 3 | Nop bai + chong gian lan co ban: gioi han thoi gian, 1 thiet bi/luot thi | api/web | Nop 1 lan (unique exam+student); vao lai sau khi da nop -> khong lam lai duoc; qua deadline -> tu dong nop dap an da luu / chan nop moi. Khoa chuyen tab la tuy chon, de sau |

## Quyet dinh thiet ke (trong pham vi)

- **Mo hinh du lieu:** `exams` (de/blueprint do Admin/Teacher tao: title, level, skill, so cau, thoi luong, cua so lich, nguoi tao) + `exam_attempts` (luot lam cua hoc vien: de da sinh `question_ids` JSON, started_at, deadline_at, submitted_at, answers JSON). `unique(exam_id, student_id)` = moi hoc vien 1 luot / de (nop 1 lan, vao lai resume dung de cu).
- **RBAC:** tao/quan ly de = Admin + Teacher; lam/nop bai = Student. Backend thuc thi that (khong chi an/hien o FE).
- **Bao mat de thi:** de tra ve cho hoc vien la "student view" — KHONG kem `correct_answer`/`explanation` (chong lo dap an). Cham diem la slice-5.
- **Gioi han thoi gian (thuc):** deadline_at = start + duration_minutes; nop sau deadline bi tu choi (`deadline_passed`).
- **Chong sinh de trung lien tiep (thuc):** khi sinh de moi cho hoc vien, so voi luot gan nhat cua chinh hoc vien; neu tap cau hoi trung y het -> rut lai (ham `generatePaper` thuan, co test bang rng tiem vao).

## Stub cho phep

Chong gian lan nang (proctoring, webcam...) chua can lam ngay. Cham diem tu dong -> slice-5. Gan de cho lop/hoc vien cu the (assignment theo class) -> de sau; MVP: hoc vien dang nhap thay de trong cua so lich va lam duoc.

## Khong duoc stub

Gioi han thoi gian lam bai va viec khong cho sinh 2 de giong nhau lien tiep cho cung hoc vien phai la thuc.

## No ky thuat

| Marker | Vi tri | Noi dung | Du kien tra |
| --- | --- | --- | --- |
| TODO(slice-4) | api/exams | Chua chay `dbmate migrate` tren Postgres that cho migration exams (ke thua no slice-0..3) | Khi co DB |
| TODO(slice-5) | api/exams | Chua cham diem; `answers` luu de slice-5 cham | slice-5 |
| TODO(later) | api/exams | Gan de theo lop/hoc vien (assignment); hien tai moi hoc vien deu thay de trong lich | sau MVP |

## Nhat ky thay doi pham vi cua rieng Slice/Task nay

| Ngay | Loai | Noi dung | Ly do | ADR |
| --- | --- | --- | --- | --- |
| 2026-09-21 | Lam ro | Chot mo hinh exams + exam_attempts, RBAC, student-safe question view | Spec khong neu chi tiet mo hinh; chon phuong an bam sat nghiem thu | (khong — additive, khong pha contract cu) |

## Cach nghiem thu

Hoc vien vao dung lich thi, lam bai, nop bai truoc/dung han; thu vao lai sau khi da nop se khong lam lai duoc de cu.

## Ban giao phien gan nhat

Dien theo mau `../../ai-workflow/templates/session-handoff.md` khi dung giua chung.
