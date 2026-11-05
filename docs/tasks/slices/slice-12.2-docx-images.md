# Slice/Task slice-12.2 — Ảnh nhúng Word tự gắn khi import bộ đề (thay đổi slice-12)

- Cơ chế: Dọc
- Owner hiện tại: An Vo
- Nhánh: `feature/slice-12.2-docx-images`
- Trạng thái: xem `../MVP-BACKLOG.md`
- Phụ thuộc: slice-12, slice-11b
- Sửa mục gốc: slice-12 (mục “Ảnh nhúng Word” đã Hoãn)

## Mục tiêu bấm được / nghiệm thu được

Giáo viên import file Word có hình trong câu hỏi: bảng xem trước hiện sẵn hình, bấm “Xác nhận import” thì hình được gắn vào đề bài của câu tương ứng — không phải chèn tay lại.

## Task

| # | Task | Tầng | Ghi chú |
| --- | --- | --- | --- |
| 1 | `readDocxImages` đọc `word/_rels/document.xml.rels` → ánh xạ `rId` → byte trong `word/media/*` (bỏ link ngoài). | api | `import-docx.ts` |
| 2 | Preview lưu từng hình qua `uploadMedia` (kiểm loại/kích thước, bỏ metadata, khử trùng theo sha256) → `mediaIds` mỗi câu; hình không hợp lệ (EMF/WMF, >2 MB, >4000px) bỏ qua kèm cảnh báo; tối đa `QUESTION_MEDIA_MAX` hình/câu. | api | `attachImportImages`; preview vẫn không tạo câu/bộ đề |
| 3 | Commit nhận `mediaIds` (tuỳ chọn, uuid) và ghi `question_media` (slot `stem`) cùng transaction với câu hỏi; id không tồn tại → 400 `media_not_found`, không ghi gì. | api + shared | `importSet`, `CommitExamSetImportItem.mediaIds` |
| 4 | Bảng xem trước hiện hình (`ExamImage`), “Xác nhận import” gửi kèm `mediaIds`. | web | `ImportExamSet.tsx` |

## Stub cho phép

Không.

## Không được stub

Lưu ảnh thật qua `MediaStorage` (disk) + `media_assets`; ảnh vẫn đi qua `GET /api/media/:id` có kiểm quyền (ADR 0013).

## Nợ kỹ thuật

| Marker | Vị trí | Nội dung | Dự kiến trả |
| --- | --- | --- | --- |
| — | `attachImportImages` | Preview bị huỷ để lại asset không có câu nào dùng | Chung với dọn asset mồ côi (slice-12 Hoãn) |

## Nhật ký thay đổi phạm vi của riêng Slice/Task này

| Ngày | Loại | Nội dung | Lý do | ADR |
| --- | --- | --- | --- | --- |
| 2026-11-14 | Thêm | Tạo task theo mục 22 từ mục slice-12 đã Hoãn | Owner đồng ý 3 slice kế tiếp | 0013 |

## Cách nghiệm thu

1. “Bộ đề & đề thi” → “Import từ Word/Excel” → chọn file .docx có hình trong một câu → “Xem trước”: hình hiện dưới câu.
2. “Xác nhận import” → trong trình soạn, bấm “Hình ảnh” của câu đó thấy hình đã gắn đề bài.
3. Gates PASS.

## Bàn giao phiên gần nhất

**2026-11-14 — An Vo (agent)**

- Đã xong: Task 1–4; mở rộng `import.test.ts` (preview lưu hình → commit gắn `stemMediaIds`) và `ExamSetsPage.test.tsx` (hình trong xem trước, commit gửi `mediaIds`).
- Chưa: nghiệm thu tay với file Word thật.
