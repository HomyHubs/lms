# Slice/Task slice-4.2 — Hoàn thiện luồng làm bài thi online (thay đổi slice-4)

- Cơ chế: Dọc
- Owner hiện tại: An Vo
- Nhánh: `bugfix/slice-4.2-exam-online-completion`
- PR: #23 https://github.com/HomyHubs/lms/pull/23
- Trạng thái: xem `../MVP-BACKLOG.md`
- Phụ thuộc: slice-4, slice-4.1, slice-5
- Sửa mục gốc: slice-4

## Hiện trạng (origin/dev `af06a32`) — kết quả rà soát

API đủ cho thi online (start/resume, checkpoint có revision, nộp 1 lần, chốt khi quá giờ, chấm, thi lại, khoá phiên). Lỗ hổng nằm ở màn học viên `ExamsPage`:

| # | Vấn đề | Mức |
| --- | --- | --- |
| 1 | Nút “Bắt đầu / Tiếp tục” gọi thẳng `POST /exams/:id/attempts`. Sau khi đã nộp: nếu được thi lại thì **tự sinh lượt mới** (tốn 1 lượt, không thấy kết quả cũ); nếu không thì chỉ báo lỗi 409 — học viên không xem lại được điểm sau khi rời màn kết quả/tải lại trang. Test cũ giả lập POST trả lượt đã nộp — khác hành vi server. | Cao |
| 2 | Nộp bài không hỏi lại khi còn câu chưa làm; không hiển thị số câu đã trả lời. | Trung bình |
| 3 | Mỗi phím gõ ở câu tự luận xếp hàng một request checkpoint riêng (hàng chờ dài, dễ trễ so với hạn). | Trung bình |
| 4 | Đóng/tải lại tab khi đang thi không có cảnh báo. | Thấp |
| 5 | Đồng hồ không đổi màu khi sắp hết giờ; thẻ đề không ghi giờ đóng. | Thấp |

## Mục tiêu bấm được / nghiệm thu được

Học viên bấm “Vào thi”: chưa làm → bắt đầu; đang làm → làm tiếp; đã nộp → xem kết quả và tự chọn “Thi lại”. Khi nộp thiếu câu phải xác nhận.

## Task

| # | Task | Tầng | Ghi chú |
| --- | --- | --- | --- |
| 1 | “Vào thi” gọi `GET /exams/:id/attempt` trước, chỉ `POST` khi 404 (chưa có lượt); “Thi lại” vẫn `POST`. | web | Mục 1 |
| 2 | Đếm “Đã trả lời x/N câu”; nộp khi còn câu trống → hộp xác nhận “Vẫn nộp bài / Làm tiếp”. Tự nộp khi hết giờ không hỏi. | web | Mục 2 |
| 3 | Checkpoint gộp: một request chạy một lúc, thay đổi mới thay bản chưa gửi (không mất đáp án cuối). | web | Mục 3 |
| 4 | `beforeunload` khi lượt đang làm; đồng hồ `role=timer`, đỏ khi ≤ 60 giây; thẻ đề ghi “Đóng lúc”. | web | Mục 4, 5 |

## Stub cho phép

Không.

## Không được stub

Server vẫn là nguồn sự thật về hạn giờ, số lượt, kết quả (ADR 0002, 0003). Không đổi API.

## Nợ kỹ thuật

| Marker | Vị trí | Nội dung | Dự kiến trả |
| --- | --- | --- | --- |

## Nhật ký thay đổi phạm vi của riêng Slice/Task này

| Ngày | Loại | Nội dung | Lý do | ADR |
| --- | --- | --- | --- | --- |
| 2026-11-14 | Thêm | Tạo task theo mục 22 sau khi rà soát luồng thi online | Owner yêu cầu hoàn thiện làm bài thi online | — |
| 2026-11-14 | Hoãn | Điều hướng nhanh giữa các câu, đánh dấu câu “xem lại”, lưu nháp offline | Cần quyết định sản phẩm; đề MVP ngắn | — |

## Cách nghiệm thu

1. Học viên thi xong, bấm “Về danh sách” rồi “Vào thi” lại → thấy kết quả cũ, số lượt không tăng cho đến khi bấm “Thi lại”.
2. Tải lại trang giữa bài → trình duyệt cảnh báo; vào lại → làm tiếp với đáp án đã lưu.
3. Nộp khi còn câu trống → hộp xác nhận; hết giờ → tự nộp không hỏi.
4. Gõ nhanh câu tự luận → Network chỉ có vài request `answers`, bản cuối đúng nội dung.
5. Gates PASS.

## Bàn giao phiên gần nhất

**2026-11-14 — An Vo (agent)**

- Đã xong: Task 1–4, test `ExamsPage.test.tsx` (mở lại đề đã nộp không gọi POST; thi lại chỉ POST 1 lần; xác nhận khi còn câu trống).
- Bước tiếp: review PR; nghiệm thu tay mục 1–4 (hai phiên đăng nhập, mobile).
