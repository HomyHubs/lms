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
| slice-3.1 | Hoàn thiện UI ngân hàng câu hỏi + import CSV/XLSX nghiêm ngặt (nghiệm thu E2E/axe) | Dọc | Done | — | dev | 7 | slice-3 | `slices/slice-3.1-question-completion.md` |
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
| slice-15 | Đồng bộ hiển thị họ tên học viên (thay SĐT làm định danh trên các màn) | Dọc | Done | — | dev | — | slice-5, slice-6, slice-13 | `slices/slice-15-dong-bo-ten-hoc-vien.md` |
| seed-demo | Dữ liệu demo thực tế hơn: mỗi cơ sở nhiều lớp (4–6) trộn Starter/Mover/Flyer, sĩ số khác nhau (commit `1012ef9`) | — | Done | — | dev | — | slice-6, slice-14 | `apps/api/src/scripts/seed-demo.ts` |
| postman-setup | Bộ tài nguyên Postman: collection "LMS API" (~95 request, 16 feature folder), environment "LMS Local", OpenAPI spec `lms-api.yaml`; cập nhật `.gitignore` để theo dõi `postman/` nhưng vẫn bỏ qua `postman/globals/` (commit `aa80a74`) | — | Done | — | dev | — | — | `postman/` (collections, environments, specs) |
| slice-16 | Dashboard Tổng quan: số trên đầu bar, đổi tên "Tổng số học viên theo khóa học/cơ sở", màu bar theo level/cơ sở, sửa nhãn chart bị che, drill-down cơ sở (mục 1) | Dọc | Chưa bắt đầu | — | — | — | slice-7 | `slices/slice-16-dashboard-tong-quan.md` |
| slice-17 | Điểm danh: calendar chọn ngày, nhóm theo cơ sở, chart điểm danh hôm nay, GUI đẹp (mục 2) | Dọc | Chưa bắt đầu | — | — | — | slice-6 | `slices/slice-17-diem-danh-view.md` |
| slice-18 | Ngân hàng câu hỏi: mẫu Excel, tab theo cấp độ, nút sửa/xóa 1 dòng, filter theo cột, panel đóng/mở + nhớ trạng thái (mục 3.1-3.4, 3.6, 3.7) | Dọc | Chưa bắt đầu | — | — | — | slice-3 | `slices/slice-18-ngan-hang-cau-hoi-ui.md` |
| slice-19 | Phân quyền sửa câu hỏi theo role (settings bật/tắt trong quản lý user) (mục 3.5; ADR 0015) | Dọc | Chưa bắt đầu | — | — | — | slice-1, slice-3 | `slices/slice-19-quyen-sua-cau-hoi.md` |
| slice-20 | Bộ đề & Đề thi: bố cục lại panel Tạo đề, filter danh sách đề, xem trước đề, mẫu Excel import (mục 4.1, 4.2, 4.3, 4.5) | Dọc | Chưa bắt đầu | — | — | — | slice-4, slice-11a | `slices/slice-20-bo-de-de-thi-ui.md` |
| slice-21 | Liên kết Đề thi ↔ Bộ đề: panel đưa câu hỏi vào/ra bộ đề + xem trước (mục 4.4; giữ mô hình bộ đề = tập câu hỏi) | Dọc | Chưa bắt đầu | — | — | — | slice-20 | `slices/slice-21-lien-ket-de-bo-de.md` |
| slice-22 | Chấm bài: link tải mẫu file, nút bắt đầu chấm, sửa kết quả, đưa điểm vào lớp + preview trước khi import (mục 5.2, 5.3) | Dọc | Chưa bắt đầu | — | — | — | slice-5, slice-9a | `slices/slice-22-cham-bai.md` |
| slice-23 | Mã học viên / mã user chuẩn hóa, tách khỏi SĐT (mục 5.1, 9.1-mã; ADR 0014, migration) | Dọc | Chưa bắt đầu | — | — | — | slice-1 | `slices/slice-23-ma-hoc-vien.md` |
| slice-24 | Báo cáo thi & xếp loại: phân trang 50/trang, chọn 20/50, dashboard pass/fail theo cơ sở/trung tâm/cấp độ (chart, %, số) (mục 6, 8) | Dọc | Chưa bắt đầu | — | — | — | slice-13, slice-7 | `slices/slice-24-bao-cao-thi-xep-loai.md` |
| slice-25 | Ngày công & giờ dạy: chi tiết theo giáo viên (filter tháng), theo lớp + chart (mục 7) | Dọc | Chưa bắt đầu | — | — | — | slice-8 | `slices/slice-25-ngay-cong-gio-day-chi-tiet.md` |
| slice-26 | Người dùng: SĐT nhỏ dưới họ tên, làm lại cột tuổi học viên (mục 9.1-hiển thị, 9.2) | Dọc | Chưa bắt đầu | — | — | — | slice-1 | `slices/slice-26-nguoi-dung-hien-thi.md` |
| slice-27 | Trung tâm cơ sở: cho sửa thông tin cơ sở (mục 10) | Dọc | Chưa bắt đầu | — | — | — | slice-1 | `slices/slice-27-trung-tam-co-so-edit.md` |
| slice-28 | Chương trình học: tạo lớp chọn cơ sở, chặn xóa lớp có học viên, sơ đồ lộ trình cấp độ (mục 11) | Dọc | Chưa bắt đầu | — | — | — | slice-1 | `slices/slice-28-chuong-trinh-hoc.md` |
| slice-29 | Ghi danh & Quản lý (đổi tên từ Gán cơ sở): 2 panel — HV/GV gán theo lớp, quản lý gán theo cơ sở (mục 12) | Dọc | Chưa bắt đầu | — | — | — | slice-1 | `slices/slice-29-ghi-danh-quan-ly.md` |
| slice-30 | Menu Học viên (mới): tìm & hồ sơ chi tiết học viên — điểm, giờ học, chuyên cần, thi, học lực (số + chart theo panel) (mục 13) | Dọc | Chưa bắt đầu | — | — | — | slice-13, slice-5, slice-6 | `slices/slice-30-menu-hoc-vien.md` |

## Trạng thái hợp lệ

Chưa bắt đầu, Đang làm, Review, Done, Done (còn nợ), Hoãn, Đã hủy, Đã thay thế. Định nghĩa đầy đủ: xem `../../AGENTS.md`, mục "Quy trình thay đổi phạm vi".

## Cách thêm một Slice/Task mới

1. Tạo file từ `slices/_TEMPLATE.md`, đặt tên `slices/<id>-<slug>.md`.
2. Thêm đúng một dòng vào bảng trên, trạng thái "Chưa bắt đầu".
3. Nếu đây là thay đổi phạm vi của một Slice/Task đã có, đọc `../../AGENTS.md` mục "Quy trình thay đổi phạm vi" trước.
