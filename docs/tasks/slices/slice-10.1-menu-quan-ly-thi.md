# Slice/Task slice-10.1 — Menu quản lý thi

- Cơ chế: Dọc
- Owner hiện tại: Notion AI
- Nhánh: feature/exam-management-menu
- PR: —
- Trạng thái: xem `../MVP-BACKLOG.md`
- Phụ thuộc: slice-10, slice-11a, slice-13
- Sửa mục gốc: slice-10

## Mục tiêu bấm được / nghiệm thu được

Gom các chức năng thi, câu hỏi và chấm thi vào một menu cha; có menu con và trang chọn chức năng bằng ô lớn. Giữ đường dẫn và phân quyền cũ, bao gồm luồng thi và lịch sử của học viên.

## Task

| # | Task | Tầng | Ghi chú |
| --- | --- | --- | --- |
| 1 | Menu cha, menu con và ô chức năng theo vai trò | UI | Không hiển thị chức năng ngoài quyền; dùng lại nguồn điều hướng và giữ URL cũ |
| 2 | Kiểm tra điều hướng, vai trò, tương thích liên kết và giao diện mobile | Test | Test các vai trò, submenu, đường dẫn cũ và trang chọn |

## Stub cho phép

Không.

## Không được stub

Quyền truy cập và các màn hình thi hiện có.

## Nợ kỹ thuật

| Marker | Vị trí | Nội dung | Dự kiến trả |
| --- | --- | --- | --- |

## Nhật ký thay đổi phạm vi của riêng Slice/Task này

| Ngày | Loại | Nội dung | Lý do | ADR |
| --- | --- | --- | --- | --- |
| 2026-11-06 | Thêm | Gom thi vào menu cha và trang chọn chức năng | Yêu cầu chủ dự án | — |

## Cách nghiệm thu

1. Admin/GV mở Quản lý thi, xem mục con và các ô: ngân hàng câu hỏi, bộ đề và đề thi, sinh câu hỏi AI, chấm bài, báo cáo thi.
2. Học viên mở bài thi và lịch sử thi qua menu cha; không truy cập chức năng quản trị. Staff không thấy mục thi nếu không có quyền.
3. Các URL cũ vẫn hoạt động, menu con làm việc trên màn hình nhỏ và không mở rộng quyền API.

## Bàn giao phiên gần nhất

- Đặc tả được commit trước khi code theo yêu cầu chủ dự án (48eb250).
- Hoàn thành menu cha, menu con và trang chọn chức năng theo vai trò; giữ URL và guard cũ. Dashboard chỉ hiện lối tắt menu cha.
- Build, lint, typecheck và 65 test web đạt. Khi cố tình bỏ các mục con, hai test mới thất bại; đã hoàn nguyên và chạy xanh. Build cảnh báo bundle trên 500 kB.
- Chưa kiểm tra thủ công trên thiết bị di động; chưa push, tạo PR hay cập nhật demo. Các yêu cầu Dashboard, ghi danh, biểu đồ và chấm công là hạng mục tiếp theo.
