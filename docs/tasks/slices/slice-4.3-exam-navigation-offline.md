# Slice/Task slice-4.3 — Điều hướng câu, đánh dấu xem lại, lưu nháp trên máy (thay đổi slice-4)

- Cơ chế: Dọc
- Owner hiện tại: An Vo
- Nhánh: `feature/slice-4.3-exam-navigation`
- Trạng thái: xem `../MVP-BACKLOG.md`
- Phụ thuộc: slice-4.2
- Sửa mục gốc: slice-4 (làm các mục slice-4.2 đã Hoãn)

## Mục tiêu bấm được / nghiệm thu được

Học viên đang thi thấy dãy số câu (đã làm tô màu, câu đánh dấu có viền), bấm để nhảy tới câu; đánh dấu “Xem lại sau” từng câu; mất mạng hoặc tải lại trang không mất đáp án.

## Task

| # | Task | Tầng | Ghi chú |
| --- | --- | --- | --- |
| 1 | `nav` “Danh sách câu”: nút số câu, trạng thái đã trả lời / xem lại trong `aria-label`, bấm cuộn tới câu. | web | |
| 2 | Nút “Xem lại sau” (`aria-pressed`) mỗi câu; đếm “Đánh dấu xem lại: n câu”; nộp khi còn câu đánh dấu → hộp xác nhận. | web | Cờ chỉ ở trình duyệt, không gửi server |
| 3 | `exam-draft.ts`: lưu đáp án + cờ vào `localStorage` theo `examId` + `startedAt` kèm revision server đã xác nhận. Vào lại lượt đang làm: bản nháp không cũ hơn server (revision ≥) và khác đáp án server → khôi phục, báo “Đã khôi phục…”, gửi checkpoint. Nộp xong → xoá nháp. | web | |
| 4 | Lưu lỗi mạng (không phải `ApiError`) → báo “Mất kết nối…”, giữ bản, tự gửi lại khi sự kiện `online`. | web | |

## Stub cho phép

Không.

## Không được stub

Server vẫn quyết định hạn giờ, revision, kết quả (ADR 0002). Không đổi API/DB. Bản nháp chỉ đi qua checkpoint thường (kiểm revision); đáp án gửi sau hạn vẫn bị server từ chối. Không chuyển lượt thi giữa thiết bị.

## Nợ kỹ thuật

| Marker | Vị trí | Nội dung | Dự kiến trả |
| --- | --- | --- | --- |

## Nhật ký thay đổi phạm vi của riêng Slice/Task này

| Ngày | Loại | Nội dung | Lý do | ADR |
| --- | --- | --- | --- | --- |
| 2026-11-14 | Thêm | Tạo task theo mục 22 từ các mục slice-4.2 đã Hoãn | Owner yêu cầu “làm tiếp cho xong” | — |

## Cách nghiệm thu

1. Bấm số câu → cuộn tới câu; câu đã làm tô màu, câu đánh dấu có viền.
2. Đánh dấu 1 câu rồi Nộp → hộp xác nhận nêu số câu đánh dấu.
3. DevTools Offline, chọn đáp án → “Mất kết nối…”; bật lại mạng → “Đã lưu đáp án”.
4. Offline, chọn đáp án, tải lại trang khi có mạng → đáp án được khôi phục và gửi lên.
5. Gates PASS.

## Bàn giao phiên gần nhất

**2026-11-14 — An Vo (agent)**

- Đã xong: Task 1–4; test `ExamsPage.test.tsx` (đánh dấu + điều hướng + xác nhận, khôi phục nháp, bỏ nháp cũ hơn server, gửi lại khi có mạng).
- Chưa: nghiệm thu tay trên mobile.
