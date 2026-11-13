# ADR 0014 — Mã học viên (student_code) (slice-23)

Status: Proposed (mặc định chọn khi người dùng bỏ qua câu hỏi xác nhận; để dạng Proposed để chủ dự án overrule nếu muốn).

## Context

Yêu cầu 5.1 (file huongdan-sua-english-center): "Mã học viên và số điện thoại là không cần giống nhau. Quy định Mã học viên cho chính xác và áp dụng trong app." Yêu cầu 9.1: hiển thị mã user, số điện thoại hiện nhỏ dưới họ tên.

Hiện tại luồng import điểm (`apps/api/src/features/exams/grade-import.ts` và `service.ts`) đã khớp học viên bằng một khóa tên `studentCode`, nhưng chưa có cột định danh ổn định tách khỏi số điện thoại ở bảng người dùng. Slice-23 phải định vị thư mục migration thực tế và xác minh cách định danh học viên đang dùng trước khi thêm cột.

## Decision

1. Thêm cột `student_code` (nullable) cho người dùng role học viên. Migration CHỈ THÊM (additive) và đảo ngược được (AGENTS.md mục 16).
2. Sinh tự động theo cơ sở: tiền tố mã cơ sở + số thứ tự zero-pad (ví dụ `HN0001`, `HCM0023`). Duy nhất toàn hệ thống. Chỉ học viên bắt buộc có mã; giáo viên/staff/admin không cần.
3. Backfill học viên hiện có khi chạy migration (sinh mã theo cơ sở đang gán). Học viên chưa gán cơ sở dùng tiền tố chung và ghi chú trong slice.
4. `student_code` là khóa khớp chính thức cho import điểm (bổ sung/thay cho số điện thoại). Số điện thoại vẫn là khóa đăng nhập, không đổi.
5. Hiển thị: mã học viên là định danh chính trên các màn liên quan; số điện thoại hiển thị phụ (nhỏ, dưới họ tên).

## Consequences

- Import điểm (slice-22) khớp theo `student_code`; cần quy tắc rõ khi mã trùng hoặc không tìm thấy (báo lỗi theo dòng, không ghi nhầm).
- Không phá vỡ đăng nhập bằng số điện thoại; không hạ thấp ràng buộc bảo mật hiện có.
- Chưa làm trong slice này: đổi mã hàng loạt, nhập mã từ hệ thống cũ (mở slice bổ sung sau kèm ADR mới nếu đổi quyết định sinh mã).
