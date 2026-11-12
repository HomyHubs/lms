# Slice/Task slice-12.1 — Hình ảnh ở form câu hỏi ngân hàng (thay đổi slice-12)

- Cơ chế: Dọc
- Owner hiện tại: An Vo
- Nhánh: `feature/slice-12.1-question-bank-images`
- Trạng thái: xem `../MVP-BACKLOG.md`
- Phụ thuộc: slice-12
- Sửa mục gốc: slice-12 (mục “Ảnh ở form câu hỏi ngân hàng” đã Hoãn)

## Mục tiêu bấm được / nghiệm thu được

Giáo viên bấm “Sửa” một câu trong ngân hàng câu hỏi, chèn hình cho đề hoặc cho từng lựa chọn, xem trước và xoá hình ngay trên form.

## Task

| # | Task | Tầng | Ghi chú |
| --- | --- | --- | --- |
| 1 | `QuestionsPage`: khi đang sửa câu → khối “Hình ảnh” dùng lại `QuestionImages` (chọn file, gắn vào lựa chọn, xoá). Khi thêm mới → gợi ý lưu câu rồi bấm “Sửa”. | web | API `PUT /api/questions/:id/media` có sẵn (slice-12); câu thuộc bộ đề đã phát hành → server trả 409, component hiện lỗi |

## Stub cho phép

Không.

## Không được stub

Không đổi API/DB. Quyền và kiểm tra file vẫn do server (ADR 0013).

## Nợ kỹ thuật

| Marker | Vị trí | Nội dung | Dự kiến trả |
| --- | --- | --- | --- |

## Nhật ký thay đổi phạm vi của riêng Slice/Task này

| Ngày | Loại | Nội dung | Lý do | ADR |
| --- | --- | --- | --- | --- |
| 2026-11-14 | Thêm | Tạo task theo mục 22 từ mục slice-12 đã Hoãn | Owner đồng ý 3 slice kế tiếp | — |

## Cách nghiệm thu

1. Ngân hàng câu hỏi → “Sửa” một câu → khối “Hình ảnh” hiện, chọn ảnh → ảnh hiện xem trước.
2. Gắn ảnh vào một lựa chọn → hiển thị ở lựa chọn đó khi làm bài.
3. “Hủy sửa” → khối hình ẩn, form thêm mới hiện gợi ý.
4. Gates PASS.

## Bàn giao phiên gần nhất

**2026-11-14 — An Vo (agent)**

- Đã xong: Task 1; test `QuestionsPage.test.tsx` (hiện/ẩn khối hình khi sửa).
- Chưa: nghiệm thu tay trên mobile.
