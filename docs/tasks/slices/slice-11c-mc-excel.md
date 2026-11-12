# Slice/Task slice-11c — Mẫu Excel trắc nghiệm dễ điền + hình từ link Google (thay đổi slice-11b)

- Cơ chế: Dọc
- Owner hiện tại: An Vo
- Nhánh: `feature/slice-11c-mc-excel`
- Trạng thái: xem `../MVP-BACKLOG.md`
- Phụ thuộc: slice-11b, slice-12.2
- Sửa mục gốc: slice-11b (Excel/CSV chỉ có header kỹ thuật, không có hình)

## Mục tiêu bấm được / nghiệm thu được

Giáo viên tải “Mẫu Excel trắc nghiệm”, điền mỗi dòng một câu (Câu hỏi, A, B, C, D, Đáp án), dán link Google Drive của hình vào cột “Hình” nếu có, rồi import: hình được tải về, gắn vào đề bài và hiện **phía trên** nội dung câu hỏi (xem trước, màn thi, màn chấm).

## Task

| # | Task | Tầng | Ghi chú |
| --- | --- | --- | --- |
| 1 | `parseSheet` nhận dạng header có “Câu hỏi” → dạng dễ điền: STT, Hình, Câu hỏi, A..F, Đáp án, Điểm, Giải thích, Độ khó (không phân biệt dấu/hoa thường, bỏ ghi chú trong ngoặc). Đáp án chữ cái → nội dung lựa chọn; lựa chọn Đúng/Sai (True/False) → `true_false`; lựa chọn trống ở giữa → lỗi. Dạng kỹ thuật cũ giữ nguyên. | api | `import-sheet.ts` (`parseFriendly`) |
| 2 | Cột “Hình”: một hoặc nhiều link (cách bằng khoảng trắng, xuống dòng hoặc `|`); chỉ https Google Drive / googleusercontent, link khác → lỗi dòng `image`. | api | `import-image-url.ts` (`googleImageUrl`) |
| 3 | Preview tải hình qua link (không dùng Google API/khoá: link chia sẻ “Bất kỳ ai có đường liên kết” tải trực tiếp), kiểm lại host mỗi lần chuyển hướng, timeout 10 giây, ≤ 2 MB, 4 link song song; rồi `uploadMedia` như slice-12.2. Link riêng tư / lỗi → cảnh báo, câu vẫn import. | api | `makeImageDownloader`, `attachImportImages` |
| 4 | Nút “Mẫu Excel trắc nghiệm (.xlsx)” + hướng dẫn cột Hình; hình hiện trước nội dung câu ở bảng xem trước, màn thi, màn chấm tay. | web | `ImportExamSet.tsx`, `ExamsPage.tsx`, `GradingPage.tsx` |

## Stub cho phép

Không.

## Không được stub

Tải hình thật qua HTTP từ Google; lưu qua `MediaStorage` + `media_assets` như slice-12.2. Test dùng `fetch` giả (không gọi mạng thật).

## Nợ kỹ thuật

| Marker | Vị trí | Nội dung | Dự kiến trả |
| --- | --- | --- | --- |
| — | `googleImageUrl` | Link chia sẻ album Google Photos (`photos.app.goo.gl`) chưa hỗ trợ — chỉ Drive và link ảnh `googleusercontent` | Khi giáo viên cần |
| — | `makeImageDownloader` | File Drive lớn có trang “không quét được virus” trả HTML → báo “chưa chia sẻ”; ảnh ≤ 2 MB không gặp | — |

## Nhật ký thay đổi phạm vi của riêng Slice/Task này

| Ngày | Loại | Nội dung | Lý do | ADR |
| --- | --- | --- | --- | --- |
| 2026-11-14 | Thêm | Tạo task: mẫu Excel trắc nghiệm + hình từ link Google, hình đứng trước nội dung câu hỏi | Owner yêu cầu | — |

## Cách nghiệm thu

1. “Bộ đề & đề thi” → “Import từ Word/Excel” → tải “Mẫu Excel trắc nghiệm (.xlsx)”.
2. Dán link Drive (đã chia sẻ “Bất kỳ ai có đường liên kết”) vào cột “Hình” của một dòng → “Xem trước”: hình hiện trên câu hỏi; link chưa chia sẻ → cảnh báo.
3. “Xác nhận import” → tạo đề thi từ bộ đề → học viên thấy hình trên câu hỏi.
4. Gates PASS.

## Bàn giao phiên gần nhất

**2026-11-14 — An Vo (agent)**

- Đã xong: Task 1–4; mở rộng `import.test.ts` (dạng dễ điền, link Google, downloader chặn chuyển hướng ra ngoài Google, preview tải hình + cảnh báo link riêng tư).
- Chưa: nghiệm thu tay với link Drive thật (máy CI không gọi Google).
