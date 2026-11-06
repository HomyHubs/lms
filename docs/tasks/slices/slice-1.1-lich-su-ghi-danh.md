# Slice/Task slice-1.1 — Bảo toàn lịch sử ghi danh

- Cơ chế: Dọc
- Owner: Notion AI
- Nhánh: feature/enrollment-history, dựa trên slice-6.1 cục bộ
- Phụ thuộc: slice-1, slice-6.1
- Sửa mục gốc: slice-1

## Mục tiêu

Khi gỡ học viên khỏi lớp, giữ bản ghi ghi danh và hồ sơ học viên, nhưng không đưa học viên đã nghỉ vào danh sách lớp, điểm danh hoặc thống kê theo lớp. Cho phép ghi danh lại mà vẫn giữ các giai đoạn trước. Lịch sử cá nhân vẫn được bảo toàn.

## Task

| # | Task | Tầng | Ghi chú |
| --- | --- | --- | --- |
| 1 | Ghi danh có thời điểm kết thúc; giữ từng giai đoạn khi tái ghi danh | DB/API | Migration additive; kiểm soát duy nhất giai đoạn đang hoạt động; giao dịch đồng thời an toàn |
| 2 | Điều chỉnh các truy vấn theo lớp/cơ sở để chỉ lấy ghi danh đang hoạt động | API | Roster, thống kê lớp và phạm vi báo cáo; không xóa dữ liệu lịch sử cá nhân |
| 3 | Kiểm tra trên PostgreSQL riêng với dữ liệu cũ, gỡ rồi ghi danh lại, phân quyền và rollback | Test | Không sử dụng database demo hoặc database test chung |

## Giới hạn

Bản ghi ghi danh đã bị xóa trước đây không thể tái tạo từ bảng hiện tại. Lịch sử trước khi triển khai có thể không đầy đủ. Dashboard lịch sử vào/ra và bộ lọc thời gian, biểu đồ và chấm công giảng viên là các hạng mục tiếp theo.

## Nghiệm thu

- Gỡ ghi danh không xóa dòng hoặc hồ sơ học viên; thời điểm rời lớp được ghi nhận.
- Tái ghi danh cùng lớp tạo giai đoạn mới, không thay đổi dữ liệu của giai đoạn cũ; hai yêu cầu đồng thời không tạo hai giai đoạn đang hoạt động.
- Danh sách lớp, roster và báo cáo theo lớp không hiện học viên đã nghỉ; điểm danh và bài thi cá nhân vẫn còn.
- Nâng cấp dữ liệu có sẵn không bịa ra thời điểm rời lớp, thử migration và các kiểm tra trên môi trường riêng. Rollback chỉ được chạy trên dữ liệu thử, vì mất thông tin giai đoạn ghi danh mới.

## Bàn giao phiên gần nhất

- Đặc tả được tạo trước khi code theo yêu cầu chủ dự án.
