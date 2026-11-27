# AGENTS.md — Exams web

## Bối cảnh feature

- Slice-4 owner: An Vo, PR #6. Independent follow-up branch: `bugfix/slice-4.1-exam-integrity`.
- Dependencies: @lms/shared contracts, @/lib/api public HTTP helpers, auth/useAuth session hook, TanStack Query.
- Contracts: POST /api/exams creates blueprint (Admin/Teacher); POST /api/exams/:id/answers checkpoints answers with expected revision; submit returns canonical idempotent result.
- ADR: docs/adr/0002-exam-attempt-integrity.md.

## Nhật ký liên tục

### 2026-11-13 — slice-20 (Bộ đề & Đề thi UI)

**Đã xong**
- 4.1: Bố cục lại `BlueprintForm.tsx` thành các nhóm trường (Thông tin chung / Lịch mở-đóng / Nguồn câu hỏi / Lớp áp dụng) với lưới `sm:grid-cols-2 lg:grid-cols-3`. Giữ nguyên toàn bộ `name`, validation `CreateExamRequest`, `formToRequest` và logic level/classIds/fixed_set.
- 4.2: Thanh lọc danh sách đề trong `ExamsPage.tsx` (Cấp độ / Kỹ năng / Cách ra đề + tìm theo tên), lọc client qua `useMemo` trên `listExams()`; hiển thị "Hiển thị X/Y đề" + trạng thái rỗng "Không có đề nào khớp bộ lọc." `useMemo` đặt trước early-return để không vi phạm rules-of-hooks.
- 4.3: `ExamPreview.tsx` chỉ-đọc — metadata đề + (fixed_set) danh sách bộ đề liên kết qua `getExamSet` (useQueries). Không tạo lượt thi, không lộ đáp án. Nút "Xem trước" chỉ hiện với manager.
- 4.5: `exam-import-template.ts` dựng mẫu `.xlsx` (header = `IMPORT_COLUMNS` + 1 dòng ví dụ) bằng `@/lib/xlsx-export`; nút "Tải mẫu Excel" (manager) trong `PageHeader`.
- Test: `exam-import-template.test.ts` (2), `ExamsPage.filter.test.tsx` (5 — lọc level/skill/mode/search, trạng thái rỗng, xem trước fixed_set, nút tải mẫu). Gate: lint 0 lỗi, typecheck sạch, `vitest run src/features/exams src/features/examsets` = 21/21 pass.

**Đang làm dở**
- Chưa commit/push/mở PR. Chưa nghiệm thu tay trên trình duyệt.

**Bước tiếp theo**
- Nghiệm thu tay theo `docs/tasks/slices/slice-20-bo-de-de-thi-ui.md` (mục "Cách nghiệm thu"), rebase `dev`, mở PR base `dev`, cập nhật trạng thái slice-20 trong `MVP-BACKLOG.md`.
- Nợ: `TODO(slice-20)` trong `ExamPreview` — gom `getExamSet` thành endpoint batch nếu nhiều bộ liên kết gây chậm.


### 2026-11-03 — Independent integrity follow-up

**Đã xong**
- Admin/Teacher blueprint creation form with shared validation, local-time inputs converted to ISO and list refresh.
- Student changes queue revision-aware checkpoints; success/failure is visible. Inputs stop accepting changes at deadline; server remains authoritative.
- Regression coverage for blueprint validation/create and checkpoint request shape, plus existing student submit, expiry and resume tests.

**Đang làm dở**
- Owner integration and independent review; no remote push/merge or production rollout.

**Bước tiếp theo**
- See docs/tasks/slices/slice-4.1-exam-integrity.md for gates and handoff.
- Perform owner/manual browser acceptance with two login sessions, refresh and deadline/offline scenarios. Browser/device takeover and recovery require product approval, not silent client workarounds.

### 2026-11-04 — slice-5 (cham diem & thi lai)

**Da xong**
- `AttemptOutcome`: diem tong, nguong, DAT/CHUA DAT, lan thi n/max; nut "Thi lai (lan N)" hoac moc thoi gian cho; thong bao het luot/de dong/cho cham tay. Khong lo dung/sai tung cau.
- Test: dat -> khong co nut thi lai; truot -> thi lai lan 2 mo de moi.

**Buoc tiep theo**
- Nghiem thu tay tren trinh duyet; man hinh lich su/ket qua cho giao vien (API da co) neu product can.
