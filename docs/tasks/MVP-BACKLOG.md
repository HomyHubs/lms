# MVP Backlog

Bảng chỉ mục cấp cao cho toàn bộ Slice / Task / layer-pass. Đây là bảng TÓM TẮT — chi tiết từng dòng nằm ở file riêng trong `docs/tasks/slices/`. Không viết mô tả dài trong bảng này để tránh xung đột khi nhiều dev cùng sửa.

## Quy tắc

- ID bất biến: chỉ thêm dòng mới, không xóa, không đánh số lại (xem `../../AGENTS.md`, mục "Quy trình thay đổi phạm vi").
- Mỗi dòng có đúng 1 Owner khi chuyển sang "Đang làm" — không nhận việc đã có Owner.
- Cột "Phụ thuộc" liệt kê ID phải Done trước khi bắt đầu — dùng để biết việc nào chạy song song được.
- Cập nhật cột Trạng thái ngay khi đổi, không chờ cuối ngày.
- Khi Slice/Task merge xong vào `dev`: chuyển Trạng thái = Done, xóa Owner, điền số PR, rồi cập nhật rollup ở `../../AGENTS.md`.

## Bảng chỉ mục

| ID | Tên | Cơ chế | Trạng thái | Owner | Nhánh | PR | Phụ thuộc | File chi tiết |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| slice-0 | Nền tảng & Auth (walking skeleton + đăng nhập SĐT + quên mật khẩu qua Email) | Dọc | Done | — | feature/slice-0-nen-tang-auth | 1 | — | `slices/slice-0-nen-tang-auth.md` |
| slice-1 | Quản lý người dùng, cơ sở (Branch) & phân quyền + role superadmin & giới hạn export học viên | Dọc | Done | — | feature/slice-1-user-branch-phan-quyen | 3 | slice-0 | `slices/slice-1-user-branch-phan-quyen.md` |
| slice-2 | OTP qua Email cho đổi/khôi phục mật khẩu (bỏ WhatsApp/Telegram) | Dọc | Done | — | feature/slice-2-otp-da-kenh | — | slice-1 | `slices/slice-2-otp-da-kenh.md` |
| slice-3 | Ngân hàng câu hỏi theo cấp độ (Starter/Mover/Flyer) + import | Dọc | Done | — | dev | 5 | slice-1 | `slices/slice-3-ngan-hang-cau-hoi.md` |
| slice-4 | Tạo đề & Thi online | Dọc | Done | — | dev | 6 | slice-3 | `slices/slice-4-tao-de-thi-online.md` |
| slice-4.5 | Sinh prompt AI & import ngược câu hỏi | Dọc | Done | — | dev | 12 | slice-3 | `slices/slice-4.5-sinh-prompt-ai-import.md` |
| slice-5 | Chấm điểm tự động & Thi lại | Dọc | Done | — | dev | 9 | slice-4 | `slices/slice-5-cham-diem-thi-lai.md` |
| slice-6 | Điểm danh | Dọc | Done | — | dev | 10 | slice-1 | `slices/slice-6-diem-danh.md` |
| slice-7 | Xếp loại học viên & Dashboard Admin (gồm ngưỡng Đậu/Rớt cấu hình theo cấp độ) | Dọc | Done | — | dev | 13 (+be1ea9c) | slice-5, slice-6 | `slices/slice-7-xep-loai-dashboard.md` |
| slice-8 | Ngày công & giờ dạy giáo viên/nhân viên | Dọc | Done | — | dev | 14 | slice-1, slice-6 | `slices/slice-8-ngay-cong-gio-day.md` |
| slice-9 | Mở rộng: chấm bán tự động Speaking/Writing + thông báo tự động (ô dù, tách thành 9a/9b) | Dọc | Hoãn | — | — | — | slice-5 | `slices/slice-9-mo-rong.md` |
| slice-9a | Chấm tay Speaking/Writing + import bảng điểm Excel | Dọc | Done | — | dev | 16 | slice-5 | `slices/slice-9a-cham-tay.md` |
| slice-9b | Thông báo tự động (in-app + outbox) | Dọc | Done | — | dev | 18 | slice-5 | `slices/slice-9b-thong-bao.md` |
| slice-10 | Giao diện chung (AppShell, điều hướng theo role) | Dọc | Done | — | dev | 15 | slice-1 | `slices/slice-10-giao-dien-chung.md` |
| slice-11a | Bộ đề cố định | Dọc | Done | — | dev | 19 | slice-4 | `slices/slice-11a-bo-de-co-dinh.md` |
| slice-11b | Import đề Word/Excel | Dọc | Done | — | dev | 21 | slice-11a | `slices/slice-11b-import-de-word-excel.md` |
| slice-11c | Import trắc nghiệm từ Excel | Dọc | Done | — | dev | 28 | slice-11a | `slices/slice-11c-mc-excel.md` |
| slice-12 | Hình ảnh câu hỏi (bank + docx + chấm) | Dọc | Done | — | dev | 22 | slice-3 | `slices/slice-12-hinh-anh-cau-hoi.md` |
| slice-13 | Lịch sử thi & Báo cáo thi | Dọc | Done | — | dev | 20 | slice-5 | `slices/slice-13-lich-su-thi-bao-cao.md` |
| slice-14 | Bài thi theo lớp | Dọc | Done | — | dev | — | slice-4 | `slices/slice-14-bai-thi-theo-lop.md` |

## Trạng thái hợp lệ

Chưa bắt đầu, Đang làm, Review, Done, Done (còn nợ), Hoãn, Đã hủy, Đã thay thế. Định nghĩa đầy đủ: xem `../../AGENTS.md`, mục "Quy trình thay đổi phạm vi".

## Cách thêm một Slice/Task mới

1. Tạo file từ `slices/_TEMPLATE.md`, đặt tên `slices/<id>-<slug>.md`.
2. Thêm đúng một dòng vào bảng trên, trạng thái "Chưa bắt đầu".
3. Nếu đây là thay đổi phạm vi của một Slice/Task đã có, đọc `../../AGENTS.md` mục "Quy trình thay đổi phạm vi" trước.
