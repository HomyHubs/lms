# Slice/Task slice-12 — Hình ảnh trong câu hỏi / bộ đề

- Cơ chế: Dọc
- Owner hiện tại: ...
- Nhánh: `feature/slice-12-hinh-anh-cau-hoi`
- PR: ...
- Trạng thái: xem `../MVP-BACKLOG.md`
- Phụ thuộc: slice-11a (Task 4 phần ảnh Word phụ thuộc thêm slice-11b)
- Sửa mục gốc: để trống

## Hiện trạng (origin/dev `eabca4f`)

Không có lưu trữ file/ảnh nào: không bảng media, không upload multipart, `Question` chỉ có text (`packages/shared/src/questions.ts`), `ExamQuestionView` không có trường ảnh.

## Mục tiêu bấm được / nghiệm thu được

Sau khi có bộ đề (tạo tay hoặc import), giáo viên chèn hình vào câu hỏi (và tuỳ chọn vào từng lựa chọn A/B/C/D); học viên thấy hình khi thi, phóng to được; hình của lượt thi đã bắt đầu không bị đổi/mất về sau.

## Task

| # | Task | Tầng | Ghi chú |
| --- | --- | --- | --- |
| 1 | **Lưu trữ media + ADR-0010.** Interface `MediaStorage` (`put/get/delete`) với 2 driver: `local` (thư mục `MEDIA_DIR`, dev/demo) và `s3` (S3-compatible: R2/MinIO; biến `.env.example` giá trị giả). Bảng `media_assets` (id, sha256 unique, mime, bytes, width, height, storage_key, created_by, created_at). `POST /api/media` (multipart, manager): chỉ png/jpeg/webp/gif kiểm bằng magic bytes, ≤ 2 MB, ≤ 4000×4000; re-encode bằng `sharp` (xoá EXIF, cạnh dài ≤ 1600px, webp); khử trùng theo sha256. | - | Không lưu binary trong DB; bucket không public |
| 2 | **Gắn ảnh vào câu hỏi + snapshot.** Bảng `question_media` (question_id, media_id, slot `stem`\|`option`, option_index null, position). Mở rộng `Question`, `CreateQuestionRequest`/`UpdateQuestionRequest` (mảng `media`), `ExamQuestionView` (`stemImages[]`, `optionImages{index→mediaId}`). Snapshot ADR-0002 chứa media id → lượt đã bắt đầu giữ đúng ảnh cũ. Media đang được snapshot tham chiếu KHÔNG xoá được (FK restrict). Câu thuộc bộ đề `published` không đổi ảnh được (bất biến slice-11a). | - | Integration PG18: đổi ảnh sau khi lượt đã bắt đầu → lượt cũ vẫn thấy ảnh cũ |
| 3 | **Phục vụ ảnh an toàn.** `GET /api/media/:id` yêu cầu đăng nhập: manager xem mọi ảnh; học viên chỉ xem ảnh nằm trong snapshot của lượt thi của chính mình (chống lộ đề trước giờ thi). Header `Cache-Control: private`, `Content-Type` chuẩn, `X-Content-Type-Options: nosniff`. | - | Route test: học viên không có lượt chứa ảnh → 404 |
| 4 | **UI chèn hình + hiển thị.** Trình soạn bộ đề (slice-11a) và form câu hỏi ngân hàng: nút "Chèn hình" (chọn file / kéo-thả / dán clipboard), xem trước, xoá, đổi thứ tự, gắn vào lựa chọn. Màn thi học viên: ảnh dưới đề/lựa chọn, `loading="lazy"`, click để phóng to, `alt` = "Hình câu N". Import Word (slice-11b): ảnh nhúng trong khối câu tự upload qua Task 1 và gắn vào câu ở bước commit. | - | Component test + nghiệm thu thủ công trên mobile |

## Stub cho phép

Driver `s3` chỉ cần test hợp đồng với MinIO local; CDN/thumbnail nhiều kích cỡ để sau.

## Không được stub

Kiểm mime thật, giới hạn kích thước, phân quyền xem ảnh, ảnh bất biến trong snapshot, không lộ ảnh trước giờ thi.

## Nợ kỹ thuật

| Marker | Vị trí | Nội dung | Dự kiến trả |
| --- | --- | --- | --- |
| TODO(slice-9) | media | Audio cho Listening dùng chung `MediaStorage` | slice-9 |

## Nhật ký thay đổi phạm vi của riêng Slice/Task này

| Ngày | Loại | Nội dung | Lý do | ADR |
| --- | --- | --- | --- | --- |
| 2026-11-05 | Thêm | Tạo slice | Yêu cầu chèn hình sau khi có bộ đề | 0010 (sẽ viết ở Task 1) |

## Cách nghiệm thu

1. Import bộ đề Excel (không ảnh) → mở trình soạn, chèn hình cho câu 3 và lựa chọn B câu 5 → phát hành → học viên thi thấy đúng hình.
2. Import Word có ảnh nhúng → ảnh tự gắn đúng câu.
3. Upload file `.exe` đổi đuôi `.png` → bị từ chối; ảnh 5 MB → bị từ chối.
4. Học viên chưa bắt đầu lượt gọi `GET /api/media/:id` → 404.
5. Gates + integration PG18 PASS.

## Bàn giao phiên gần nhất

Điền theo mẫu `../../ai-workflow/templates/session-handoff.md` khi dừng giữa chừng.
