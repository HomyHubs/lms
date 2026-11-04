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
| slice-1 | Quản lý người dùng, cơ sở (Branch) & phân quyền | Dọc | Done | — | feature/slice-1-user-branch-phan-quyen | 3 | slice-0 | `slices/slice-1-user-branch-phan-quyen.md` |
| slice-2 | OTP đa kênh (WhatsApp/Telegram) cho đổi/khôi phục mật khẩu | Dọc | Done (còn nợ) | — | feature/slice-2-otp-da-kenh | 4 | slice-1 | `slices/slice-2-otp-da-kenh.md` |
| slice-3 | Ngân hàng câu hỏi theo cấp độ (Starter/Mover/Flyer) + import | Dọc | Done | — | feature/slice-3-ngan-hang-cau-hoi | 5 | slice-1 | `slices/slice-3-ngan-hang-cau-hoi.md` |
| slice-4 | Tạo đề & Thi online | Dọc | Done | — | feature/slice-4-tao-de-thi-online | 6 | slice-3 | `slices/slice-4-tao-de-thi-online.md` |
| slice-4.5 | Sinh prompt AI & import ngược câu hỏi | Dọc | Done | — | feature/slice-4.5-sinh-prompt-ai-import | 12 | slice-3 | `slices/slice-4.5-sinh-prompt-ai-import.md` |
| slice-5 | Chấm điểm tự động & Thi lại | Dọc | Done (ngoại lệ §9.4 đã đóng: PR #6 merge trước, slice-5 rebase lên dev) | — | feature/slice-5-cham-diem-thi-lai | 9 | slice-4 | `slices/slice-5-cham-diem-thi-lai.md` |
| slice-6 | Điểm danh | Dọc | Done | — | feature/slice-6-diem-danh | 10 | slice-1 | `slices/slice-6-diem-danh.md` |
| slice-7 | Xếp loại học viên & Dashboard Admin | Dọc | Done | — | feature/slice-7-xep-loai-dashboard | 13 | slice-5, slice-6 | `slices/slice-7-xep-loai-dashboard.md` |
| slice-8 | Ngày công & giờ dạy giáo viên/nhân viên | Dọc | Done | — | feature/slice-8-ngay-cong-gio-day | 14 | slice-1, slice-6 | `slices/slice-8-ngay-cong-gio-day.md` |
| slice-9 | Mở rộng: chấm bán tự động Speaking/Writing + thông báo tự động | Dọc | Hoãn | — | — | — | slice-5 | `slices/slice-9-mo-rong.md` |
| slice-10 | Giao diện chung: AppShell, dashboard theo vai trò, restyle | Dọc | Done | — | feature/ui-shell | 15 | slice-8 | `slices/slice-10-giao-dien-chung.md` |

## Công việc bổ sung theo mục 22

| ID | Tên | Cơ chế | Trạng thái | Owner | Nhánh | PR | Phụ thuộc | File chi tiết |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| slice-2.1 | Reset security (thay đổi slice-2) | Dọc | Done | — | bugfix/slice-2.1-reset-security | 8 | slice-1/2 merged PR3/4 (bảng lịch sử stale) | `slices/slice-2.1-reset-security.md` |

## Trạng thái hợp lệ

Chưa bắt đầu, Đang làm, Review, Done, Done (còn nợ), Hoãn, Đã hủy, Đã thay thế. Định nghĩa đầy đủ: xem `../../AGENTS.md`, mục "Quy trình thay đổi phạm vi".

## Cách thêm một Slice/Task mới

1. Tạo file từ `slices/_TEMPLATE.md`, đặt tên `slices/<id>-<slug>.md`.
2. Thêm đúng một dòng vào bảng trên, trạng thái "Chưa bắt đầu".
3. Nếu đây là thay đổi phạm vi của một Slice/Task đã có, đọc `../../AGENTS.md` mục "Quy trình thay đổi phạm vi" trước.

## Bổ sung slice-3 theo mục 22

| ID | Tên | Cơ chế | Trạng thái | Owner | Nhánh | PR | Phụ thuộc | File chi tiết |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| slice-3.1 | Question UI/import completion (thay đổi slice-3) | Dọc | Done | — | bugfix/slice-3.1-question-completion | 7 | slice-1/3 merged PR3/5 (bảng lịch sử stale) | `slices/slice-3.1-question-completion.md` |
