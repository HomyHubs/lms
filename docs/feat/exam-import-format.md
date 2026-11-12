# Định dạng file import bộ đề (slice-11b)

> updated 2026-11-14 · 555143a

Giáo viên/Admin tải một file lên trang **Bộ đề & đề thi → Import từ Word/Excel**, xem trước, rồi xác nhận để tạo một bộ đề `draft` (slice-11a). File mẫu tải về: `/templates/mau-trac-nghiem.xlsx` (dễ điền, slice-11c), `/templates/mau-bo-de.docx`, `/templates/mau-bo-de.xlsx`, `/templates/mau-bo-de.csv` (`apps/web/public/templates/`, sinh bằng `apps/api/scripts/make-import-fixtures.mjs`).

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
- Hình nhúng (slice-12.2): ghi nhận `imageRefs`; bước xem trước lưu từng hình thành media asset (PNG/JPEG/WebP/GIF, ≤ 2 MB, ≤ 4000 px, bỏ metadata) và trả `mediaIds`; xác nhận import gắn chúng vào đề bài câu tương ứng. Hình không hỗ trợ (EMF/WMF, quá lớn, link ngoài) bị bỏ qua kèm cảnh báo; tối đa `QUESTION_MEDIA_MAX` hình mỗi câu. Excel/CSV: hình qua link Google ở dạng dễ điền (bên dưới).
- Unicode được chuẩn hoá NFC, khoảng trắng thừa bị gộp.

## Excel (.xlsx) / CSV

- Chỉ đọc **sheet đầu tiên** (cảnh báo nếu có nhiều sheet). Dòng 1 là header, dùng tên cột của `IMPORT_COLUMNS` (slice-3) + cột tuỳ chọn `order`.
- Bắt buộc: `question_type`, `question_text`, `correct_answer`.
- Tuỳ chọn: `level`, `skill` (để trống → lấy giá trị ở form import; nếu điền phải trùng với form), `difficulty` (mặc định `medium`), `options` (ngăn cách bằng `|`), `points`, `explanation`, `source_reference`, `order` (số nguyên dương; sắp xếp theo `order`, trùng thì giữ thứ tự dòng).
- Lỗi báo theo số dòng Excel thật (`Dòng 5 · correct_answer: …`). Đáp án trắc nghiệm phải là chữ cái hoặc nội dung của một lựa chọn.

## Excel trắc nghiệm dễ điền (slice-11c)

Header có cột **Câu hỏi** → đọc theo dạng này (cả .xlsx và CSV). Tên cột không phân biệt dấu/hoa thường, phần trong ngoặc bị bỏ qua (`Hình (link Google Drive)` = `Hinh`).

| STT | Hình (link Google Drive) | Câu hỏi | A | B | C | D | Đáp án | Điểm | Giải thích |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | https://drive.google.com/file/d/…/view | Con gì kêu meo meo? | dog | cat | fish | bird | B | 1 | |
| 2 | | Mặt trời mọc ở hướng đông. | Đúng | Sai | | | A | | |

- Bắt buộc: `Câu hỏi`, `A`, `B`, `Đáp án`. Tuỳ chọn: `STT` (thứ tự), `Hình`, `C`..`F`, `Điểm`, `Giải thích`, `Độ khó` (`dễ` / `trung bình` / `khó`, mặc định trung bình). Cấp độ/kỹ năng lấy từ form import.
- Đáp án là chữ cái (A–F) hoặc nội dung lựa chọn; chữ cái được lưu thành nội dung lựa chọn. Lựa chọn phải liên tiếp (không bỏ trống C rồi điền D). Hai lựa chọn `Đúng`/`Sai` (hoặc `True`/`False`) → `true_false`, còn lại `multiple_choice`.
- **Cột Hình**: một hoặc nhiều link, cách bằng khoảng trắng, xuống dòng hoặc `|`. Chỉ nhận link https của Google Drive (`drive.google.com/file/d/<id>/…`, `…/open?id=<id>`) hoặc link ảnh `*.googleusercontent.com`; link khác → lỗi dòng `image`.
- Không cần Google API hay khoá: file phải chia sẻ **“Bất kỳ ai có đường liên kết”**; bước xem trước tải hình trực tiếp (chuyển hướng chỉ đi trong host Google, 10 giây/link, ≤ 2 MB), rồi lưu như hình Word (slice-12.2) và trả `mediaIds`. Link chưa chia sẻ / lỗi tải → cảnh báo, câu vẫn import không hình.
- Hình gắn vào đề bài và hiển thị **phía trên nội dung câu hỏi** ở bảng xem trước, màn thi và màn chấm tay.
