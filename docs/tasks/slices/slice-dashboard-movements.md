# Dashboard — lịch sử ghi danh, biểu đồ và chấm công giáo viên

## Mục tiêu

Thực hiện các yêu cầu còn lại của chủ dự án sau phần bảo toàn ghi danh. Dùng dữ liệu thật, phân quyền theo cơ sở; không khẳng định hiện diện trực tiếp khi không có điểm danh rời lớp.

## Các phần

1. **Lịch sử vào/ra**: Admin bấm ô học viên ở Tổng quan để xem sự kiện đăng ký/ngừng đăng ký theo cơ sở; chọn tháng hoặc từ ngày–đến ngày; tổng vào/ra đếm theo lượt ghi danh, không nhầm với số học viên duy nhất. Chỉ hiển thị sự kiện thuộc cơ sở được phép. Các sự kiện cũ không xác định được cơ sở không được gán bừa; giải thích lịch sử có thể thiếu các bản ghi từng bị xóa.
2. **Điểm danh**: ô/đường dẫn Tổng quan mở bảng điểm danh nhiều lớp đã triển khai; mô tả con số là tình trạng được ghi nhận, không xác nhận có mặt thực tế sau khi về sớm.
3. **Biểu đồ**: bổ sung biểu đồ thanh và tròn phù hợp cho báo cáo thi, điểm danh, ngày công & giờ dạy, xếp loại, sử dụng dữ liệu và bộ lọc đang hiển thị; có nhãn, số liệu dạng văn bản và trạng thái không có dữ liệu, không đưa các nhóm chồng lấn vào một biểu đồ tỷ trọng.
4. **Admin chấm công giáo viên**: xem giáo viên trong phạm vi cơ sở được phân quyền và check-in/check-out thay giáo viên, ghi thời điểm máy chủ và người thao tác trong nhật ký; xử lý yêu cầu đồng thời và bảo toàn bản ghi cũ. Phân biệt chấm công ca làm với giờ dạy tính theo buổi học; không cho Admin ngoài phạm vi thao tác. Lịch sử thời điểm và người thao tác phải xem được.

## Kiểm tra

- Viết và chạy test API phân quyền, bộ lọc, ranh giới ngày theo Asia/Ho_Chi_Minh, dữ liệu cũ không rõ cơ sở và số liệu vào/ra; test giao diện tương tác, rỗng/lỗi và đường dẫn.
- Kiểm tra từng báo cáo có biểu đồ đúng dữ liệu, bao gồm rỗng và giá trị 0; thử giao diện hẹp khi khả thi.
- PostgreSQL riêng: migration dữ liệu cũ, kiểm tra audit, các trường hợp check-in/out đồng thời, từ chối sai phạm vi; không dùng database demo hay test chung.
- Build, lint, typecheck và các test liên quan; ghi kết quả và commit triển khai sau kiểm tra. Không push, merge hoặc cập nhật demo nếu chưa được yêu cầu.

## Phụ thuộc và giới hạn

Nhánh `feature/enrollment-history` chứa điểm danh và bảo toàn ghi danh; nhánh menu thi còn tách riêng. Chỉ sự kiện mới có ảnh chụp cơ sở; dữ liệu cũ đã bị xóa không thể khôi phục. Rollback migration sau khi phát sinh dữ liệu lịch sử phải tránh làm mất dữ liệu.

## Tiến độ

- Kế hoạch commit `4dddb02` trước code. Dashboard mở lịch sử ghi danh theo cơ sở, tháng hoặc khoảng ngày; đếm lượt vào/ra và cho biết giới hạn dữ liệu cũ. Có đường dẫn tới bảng điểm danh.
- API test 8/8 trên PostgreSQL riêng, UI test 1/1, build/lint/typecheck đạt; đổi múi giờ sang UTC làm test ranh giới ngày thất bại, sau đó khôi phục. Chưa kiểm tra giao diện trên trình duyệt thật.
- Đã bổ sung biểu đồ thanh và tròn cho kết quả thi trong danh sách, điểm danh hôm nay, trạng thái buổi dạy, phút công theo vai trò và xếp loại. Báo cáo thi giới hạn 5.000 lượt gần nhất; phút công phản ánh tất cả cơ sở của nhân sự được gán cơ sở lọc. Bộ test web 67/67 đạt; chưa kiểm tra giao diện trên trình duyệt thật.
- Admin chấm công giáo viên chưa triển khai; chưa push, merge hay cập nhật demo.
