# Định dạng file import bộ đề (slice-11b)

> updated 2026-11-12 · af06a32

Giáo viên/Admin tải một file lên trang **Bộ đề & đề thi → Import từ Word/Excel**, xem trước, rồi xác nhận để tạo một bộ đề `draft` (slice-11a). File mẫu tải về: `/templates/mau-bo-de.docx`, `/templates/mau-bo-de.xlsx`, `/templates/mau-bo-de.csv` (`apps/web/public/templates/`, sinh bằng `apps/api/scripts/make-import-fixtures.mjs`).

## Luồng API (2 bước)

| Bước | Endpoint | Body | Ghi DB |
| --- | --- | --- | --- |
| Xem trước | `POST /api/exam-sets/import/preview?title=&level=&skill=&fileName=` | **byte thô của file**, `content-type: application/octet-stream` | Không |
| Xác nhận | `POST /api/exam-sets/import/commit` | JSON `CommitExamSetImportRequest` (title, level, skill, items[]) | Có — 1 transaction |

- Contract: `packages/shared/src/exam-set-import.ts`. Quyền: Admin/Teacher (manager), như các endpoint bộ đề khác.
- Preview trả `ExamSetImportPreview { format, items[], errors[{block,row,field,message}], warnings[] }`. `block` = số câu (Word), `row` = số dòng thật trong Excel/CSV.
- Commit validate lại từng câu bằng `QuestionImportRow` (không tin preview). Một câu sai → `400 invalid_import` kèm `errors[]`, **không ghi gì** (all-or-nothing). Thành công → `201 { examSet }` với các câu mới `source = exam_set`, đúng thứ tự.
- Không dùng `multipart/form-data` (không thêm `@fastify/multipart`): một file / một request nên gửi byte thô + query là đủ, ít phụ thuộc hơn. Xem nhật ký phạm vi slice-11b.

## Giới hạn & kiểm tra file

- ≤ 10 MB (`EXAM_IMPORT_MAX_BYTES`), ≤ 200 câu (`EXAM_SET_MAX_ITEMS`).
- Loại file xác định bằng **magic bytes**, không tin đuôi file: `.docx`/`.xlsx` phải là ZIP Office thật (có `word/document.xml` / `xl/workbook.xml`); CSV phải là văn bản UTF-8.
- Từ chối: `.doc`/`.xls` (OLE2), PDF → "Hãy lưu lại dạng .docx"; file có mật khẩu, macro, liên kết ngoài, XML có `DOCTYPE/ENTITY`; ZIP giải nén quá lớn hoặc quá nhiều thành phần; ô Excel chứa công thức.

## Word (.docx)

Mỗi câu là một khối đoạn văn:

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

- Nhận `Câu 1:` / `Câu 1.` / `Question 1:`; lựa chọn `A.` / `A)` / `a.`; `Đáp án:` / `Answer:`.
- **Bắt buộc có dòng `Đáp án`** — in đậm/gạch chân không được dùng để đoán đáp án. Thiếu → lỗi `Câu N: thiếu dòng Đáp án`; chữ cái đáp án ngoài các lựa chọn → lỗi.
- Đúng/Sai: hai lựa chọn `Đúng`/`Sai` (hoặc `True`/`False`) → `true_false`.
- Văn bản trước câu đầu tiên bị bỏ qua (cảnh báo). Bảng được đọc như văn bản (cảnh báo). Công thức toán (OMML) giữ dạng chữ thô (cảnh báo).
- Hình nhúng: ghi nhận vào `imageRefs` và cảnh báo "Có N hình sẽ được gắn sau" — gắn ảnh là slice-12 (`TODO(slice-12)` trong `import-docx.ts`).
- Unicode được chuẩn hoá NFC, khoảng trắng thừa bị gộp.

## Excel (.xlsx) / CSV

- Chỉ đọc **sheet đầu tiên** (cảnh báo nếu có nhiều sheet). Dòng 1 là header, dùng tên cột của `IMPORT_COLUMNS` (slice-3) + cột tuỳ chọn `order`.
- Bắt buộc: `question_type`, `question_text`, `correct_answer`.
- Tuỳ chọn: `level`, `skill` (để trống → lấy giá trị ở form import; nếu điền phải trùng với form), `difficulty` (mặc định `medium`), `options` (ngăn cách bằng `|`), `points`, `explanation`, `source_reference`, `order` (số nguyên dương; sắp xếp theo `order`, trùng thì giữ thứ tự dòng).
- Lỗi báo theo số dòng Excel thật (`Dòng 5 · correct_answer: …`). Đáp án trắc nghiệm phải là chữ cái hoặc nội dung của một lựa chọn.
