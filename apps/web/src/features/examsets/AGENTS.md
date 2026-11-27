# AGENTS.md — Exam sets web

## Bối cảnh feature

- Mô hình "bộ đề = tập câu hỏi có thứ tự" (slice-11a, ADR 0011): bảng `exam_set_items`, API `PUT /api/exam-sets/:id/items` (thay toàn bộ danh sách theo thứ tự), `POST /api/exam-sets/:id/questions` (soạn câu mới).
- Dependencies: @lms/shared contracts (ExamSet/ExamSetDetail/Question), @/lib/api exam-set helpers, useExamSets/useExamSet/useExamSetCommand, useQuestions, TanStack Query.
- Bất biến: bộ đề `published`/`archived` không sửa được items (BE + UI khoá).

## Nhật ký liên tục

### 2026-11-13 — slice-21 (Liên kết Đề thi ↔ Bộ đề, mục 4.4)

**Đã xong**
- Tách `BankPicker` ra file riêng (`BankPicker.tsx`) và nâng cấp: ô tìm theo nội dung câu hỏi (aria-label "Tìm câu hỏi"), lọc theo loại câu (aria-label "Lọc loại câu hỏi") và độ khó ("Lọc độ khó"), chọn nhiều câu bằng checkbox rồi "Thêm N câu đã chọn vào bộ đề" gọi một lần `replaceExamSetItems` (append, giữ thứ tự). Vẫn giữ nút "Thêm" từng câu.
- `ExamSetPreview.tsx`: xem trước bộ đề CHỈ ĐỌC, liệt kê câu theo thứ tự + lựa chọn, KHÔNG lộ `correctAnswer`/`explanation`. Nút "Xem trước bộ đề" trong `SetEditor` (toggle state `previewing`).
- `ExamSetsPage.tsx`: dùng BankPicker mới (`onAddMany`), bỏ BankPicker nội bộ cũ; thêm nút + render preview.
- Test (`ExamSetsPage.test.tsx`): tìm theo nội dung; lọc theo loại/độ khó; chọn nhiều câu → một PUT /items đúng thứ tự; xem trước không lộ đáp án. Gate: lint sạch, typecheck sạch, `vitest run src/features/examsets` = 6/6 pass.

**Đang làm dở**
- Nhánh `feature/slice-21-lien-ket-de-bo-de` tạo TỪ nhánh slice-20 (slice-20 chưa merge dev). Phải rebase lên `dev` sau khi slice-20 merge, chạy lại cổng gác rồi mới mở PR. Chưa nghiệm thu tay trên trình duyệt.

**Bước tiếp theo**
- Nghiệm thu tay theo `docs/tasks/slices/slice-21-lien-ket-de-bo-de.md`; rebase sau khi slice-20 vào `dev`; mở PR base `dev`.
- Nợ: `TODO(slice-21)` trong `ExamSetPreview` — kéo-thả sắp xếp thay nút lên/xuống.
