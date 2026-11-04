# Slice/Task slice-11b — Import bộ đề từ Word (.docx) và Excel (.xlsx/.csv)

- Cơ chế: Dọc
- Owner hiện tại: ...
- Nhánh: `feature/slice-11b-import-de-word-excel`
- PR: ...
- Trạng thái: xem `../MVP-BACKLOG.md`
- Phụ thuộc: slice-11a
- Sửa mục gốc: để trống

## Hiện trạng (origin/dev `eabca4f`)

- Đã có import câu hỏi vào NGÂN HÀNG từ CSV/XLSX theo `IMPORT_COLUMNS` (`packages/shared/src/questions.ts`, `POST /api/questions/import`, strict all-or-nothing, báo lỗi theo dòng/field — slice-3/3.1). File được parse ở FE (`QuestionsPage.tsx`).
- CHƯA có: import từ Word; import thành một BỘ ĐỀ (có tên, thứ tự câu); bước xem trước trước khi lưu.

## Mục tiêu bấm được / nghiệm thu được

Giáo viên tải lên file Word hoặc Excel chứa câu trắc nghiệm + đáp án, xem trước từng câu đã nhận diện cùng lỗi (nếu có), xác nhận → hệ thống tạo một bộ đề `draft` (slice-11a) đúng thứ tự câu; file sai định dạng bị từ chối toàn bộ, báo rõ vị trí lỗi.

## Định dạng file chuẩn (Task 1 viết vào `docs/feat/exam-import-format.md` + file mẫu tải về được)

**Excel/CSV**: dùng lại `IMPORT_COLUMNS` + cột tuỳ chọn `order`. `level`/`skill` được bỏ trống từng dòng nếu đã chọn ở form import (giá trị form làm mặc định). Chỉ đọc sheet đầu tiên.

**Word (.docx)** — mỗi câu là một khối:

```text
Câu 1: Nội dung câu hỏi (có thể nhiều dòng)
A. Lựa chọn 1
B. Lựa chọn 2
C. Lựa chọn 3
D. Lựa chọn 4
Đáp án: B
Giải thích: (tuỳ chọn)
Điểm: 1 (tuỳ chọn)
```

- Nhận cả `Câu 1.` / `Question 1:`, `A)` / `a.`, `Đáp án:` / `Answer:`. Định dạng in đậm/gạch chân KHÔNG được dùng làm đáp án (tránh đoán) — bắt buộc có dòng `Đáp án`.
- Đúng/Sai: `A. Đúng` `B. Sai` (hoặc True/False) → `true_false`.
- Hình nhúng trong khối câu: ghi nhận vị trí; gắn ảnh làm ở slice-12 Task 4. Slice này chỉ cảnh báo "có N hình sẽ được gắn sau".

## Task

| # | Task | Tầng | Ghi chú |
| --- | --- | --- | --- |
| 1 | **Contract + endpoint 2 bước + tài liệu định dạng.** `ExamSetImportPreview` (title, level, skill, items[] {order, questionType, questionText, options, correctAnswer, points, explanation, warnings[], imageRefs[]}, errors[] {block\|row, field, message}). `POST /api/exam-sets/import/preview` (multipart, trả preview, KHÔNG ghi DB) và `POST /api/exam-sets/import/commit` (nhận preview đã xác nhận, validate lại bằng `QuestionImportRow`, tạo `exam_set` draft + `questions` source=`exam_set` + `exam_set_items` trong 1 transaction). Giới hạn: file ≤ 10 MB, ≤ 200 câu, mime kiểm bằng magic bytes. Viết `docs/feat/exam-import-format.md` + file mẫu `.docx`/`.xlsx`. | - | Thêm `@fastify/multipart` (dùng chung với slice-12) |
| 2 | **Parser Excel/CSV phía server** (`apps/api/src/features/examsets/import-sheet.ts`): tái dùng thư viện XLSX FE đang dùng (kiểm `apps/web/package.json`) hoặc `exceljs`; map header theo `IMPORT_COLUMNS` + `order`; áp mặc định level/skill từ form; báo lỗi theo số dòng Excel thật. | - | Unit test: file đúng, thiếu cột, enum sai, đáp án không nằm trong options |
| 3 | **Parser Word** (`import-docx.ts`): `mammoth` (docx → HTML giữ đoạn + ảnh) hoặc đọc trực tiếp `word/document.xml`; state machine tách khối Câu / Lựa chọn / Đáp án / Giải thích / Điểm; chuẩn hoá Unicode NFC, bỏ khoảng trắng thừa; lỗi theo "Câu N, dòng M". Giữ tham chiếu ảnh nhúng (rId → vị trí) vào `imageRefs`. | - | Fixture `.docx` thật trong `apps/api/test/fixtures/` (đúng, thiếu đáp án, đáp án ngoài A–D, có ảnh, có bảng) |
| 4 | **UI import** trong trang Bộ đề: nút "Import từ Word/Excel", form tên đề + level + skill + file, bảng xem trước (trạng thái OK/Lỗi/Cảnh báo, đánh dấu đáp án đúng), link tải file mẫu, Xác nhận → mở trình soạn bộ đề slice-11a để sửa tiếp / phát hành. | - | Component test; nghiệm thu thủ công với 2 file mẫu |

## Stub cho phép

- `.doc` (Word cũ), PDF, ảnh scan/OCR: từ chối với thông báo "Hãy lưu lại dạng .docx".
- Công thức toán (OMML) trong Word: giữ dạng text thô + cảnh báo.

## Không được stub

Validate thực, all-or-nothing, không ghi DB ở bước preview, RBAC manager, giới hạn kích thước/số câu, kiểm mime thật.

## Nợ kỹ thuật

| Marker | Vị trí | Nội dung | Dự kiến trả |
| --- | --- | --- | --- |
| TODO(slice-12) | import-docx.ts | Gắn ảnh nhúng vào câu hỏi | slice-12 |

## Nhật ký thay đổi phạm vi của riêng Slice/Task này

| Ngày | Loại | Nội dung | Lý do | ADR |
| --- | --- | --- | --- | --- |
| 2026-11-05 | Thêm | Tạo slice | Yêu cầu import đề từ Word/Excel | — |

## Cách nghiệm thu

1. Import file Word mẫu 20 câu → preview đủ 20 câu, đáp án đúng; commit → bộ đề draft 20 câu đúng thứ tự.
2. Import Excel mẫu → tương tự.
3. File Word có 1 câu thiếu "Đáp án" → preview báo "Câu 7: thiếu dòng Đáp án", nút Xác nhận bị khoá, DB không đổi.
4. Gates build/lint/typecheck/test + integration PG18 PASS.

## Bàn giao phiên gần nhất

Điền theo mẫu `../../ai-workflow/templates/session-handoff.md` khi dừng giữa chừng.
