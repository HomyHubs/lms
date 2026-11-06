# Slice/Task slice-6.1 — Điểm danh nhiều lớp và hiện diện

- Cơ chế: Dọc
- Owner hiện tại: Notion AI
- Nhánh: feature/slice-6.1-diem-danh-hien-dien
- PR: —
- Trạng thái: xem `../MVP-BACKLOG.md`
- Phụ thuộc: slice-6, slice-8
- Sửa mục gốc: slice-6

## Mục tiêu bấm được / nghiệm thu được

Staff và Admin xem các buổi học hôm nay theo cơ sở được phân quyền, điểm danh nhiều lớp, chọn cả lớp rồi bỏ chọn học viên vắng và ghi nhận học viên đến lớp; nếu học viên về sớm thì ghi chú, không điểm danh rời lớp. Dashboard hiển thị tình trạng theo dữ liệu đã ghi, không khẳng định hiện diện thực tế theo thời gian thực.

## Task

| # | Task | Tầng | Ghi chú |
| --- | --- | --- | --- |
| 1 | Bảng điểm danh nhiều lớp hôm nay theo cơ sở, chọn toàn bộ và bỏ chọn từng học viên, chọn trễ 5/10/15/20 phút | UI + API | Staff/Admin chỉ thao tác trong cơ sở được gán; giữ luồng giáo viên hiện có |
| 2 | Ghi nhận giờ đến và người thao tác, cho ghi chú học viên về sớm; xem số và danh sách theo cơ sở, lớp | DB + API + UI | Không ghi nhận rời lớp; không suy ra giờ đến của dữ liệu cũ; hiển thị theo ghi nhận và trạng thái chưa xác nhận |
| 3 | Tách người điểm danh khỏi giáo viên thực dạy trong báo cáo giờ dạy | DB + API + UI | Staff/Admin ghi điểm danh không được trở thành giáo viên thực dạy; bảo toàn kết quả và dữ liệu cũ |
| 4 | Kiểm thử luồng, phân quyền cơ sở, nhiều lớp và báo cáo giờ dạy trên dữ liệu thật | Test | Kiểm tra migration đảo ngược và bảo toàn dữ liệu |

## Stub cho phép

Không.

## Không được stub

Phân quyền cơ sở; dữ liệu đến, trạng thái vắng/trễ và giáo viên thực dạy phải có nguồn ghi nhận thật. Không gán giờ đến cho dữ liệu cũ chưa biết; không coi trạng thái theo điểm danh là bằng chứng học viên vẫn còn ở lớp.

## Nợ kỹ thuật

| Marker | Vị trí | Nội dung | Dự kiến trả |
| --- | --- | --- | --- |

## Nhật ký thay đổi phạm vi của riêng Slice/Task này

| Ngày | Loại | Nội dung | Lý do | ADR |
| --- | --- | --- | --- | --- |
| 2026-11-06 | Thêm | Điểm danh nhiều lớp bởi Staff/Admin, giờ đến và trễ; tách người điểm danh khỏi giáo viên thực dạy | Yêu cầu người dùng; tránh báo cáo công sai | Cần trước khi code |
| — | Làm rõ | Không điểm danh rời lớp; học viên về sớm chỉ cần ghi chú | Giảm thao tác theo yêu cầu người dùng | Cần trước khi code |

## Cách nghiệm thu

1. Một cơ sở có nhiều lớp cùng ngày; Staff/Admin chọn toàn bộ một lớp rồi bỏ chọn một học viên vắng, chọn trễ 5/10/15/20 phút cho các học viên khác và lưu.
2. Ghi nhận giờ đến và ghi chú về sớm; số và danh sách theo lớp/cơ sở phản ánh dữ liệu đã ghi, không khẳng định số người vẫn ở lớp theo thời gian thực.
3. Staff/Admin không xem hoặc ghi ngoài cơ sở được phân quyền; giáo viên thực dạy không bị đổi thành người điểm danh.
4. Dữ liệu điểm danh và báo cáo giờ dạy trước thay đổi vẫn được giữ; migration, kiểm thử và cổng gác đạt.

## Bàn giao phiên gần nhất

- Đang lập phạm vi; chưa code, chưa có ADR hay migration, chưa kiểm thử.
