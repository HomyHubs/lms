# ADR 0019 — Nhập điểm chỉ khớp theo mã học viên; số điện thoại ở lại nhưng không còn là khoá

Status: Accepted

## Context

Slice-23 (mã học viên) đưa `users.student_code` thành khoá chính khi nhập bảng điểm Speaking/Writing từ Excel, nhưng vẫn giữ **fallback theo số điện thoại** để không phá file cũ của trung tâm (file mà cột "mã học viên" thực chất chứa SĐT). Marker `TODO(slice-23)` ghi rằng fallback sẽ được gỡ "khi 100% học viên đã có `student_code`".

Ngày 2026-11-27, hướng an toàn được chọn: giữ fallback nhưng bắt nó **lộ ra** — mỗi dòng khớp bằng SĐT được trả về trong `matchedByPhone` (kết quả nhập) và `matchedBy` (từng dòng xem trước) để UI cảnh báo.

Ngay sau đó chủ dự án quyết định khác: **gỡ hẳn fallback SĐT**, nhưng **giữ lại số điện thoại** như dữ liệu bình thường (cột `users.phone_number`, hiển thị trong hồ sơ, hàng đợi chấm bài, liên hệ phụ huynh). Tức là bỏ *đường khớp*, không bỏ *trường dữ liệu*.

Lý do đổi hướng: fallback làm hai khoá cùng tồn tại cho một việc, nên không bao giờ biết chắc dòng nào khớp vì lý do gì khi có sự cố; và "100% học viên có mã" không thể chứng minh từ code, nên chờ đủ điều kiện đó là chờ vô hạn. Cảnh báo (hướng an toàn) chỉ làm fallback dễ thấy hơn, không làm nó đúng hơn.

## Decision

1. **Khớp chỉ theo `student_code`.** Bỏ hẳn bảng tra theo SĐT trong `importGrades` và `previewImportGrades`. Dòng không khớp mã → `student_not_found`.
2. **Số điện thoại ở lại nguyên vẹn.** Không xoá cột `users.phone_number`, không xoá `GradingRow.student_phone`, không bỏ ô SĐT ở form học viên, không đổi hàng đợi chấm bài. SĐT chỉ mất vai trò *khoá khớp trong file import*.
3. **Phạm vi (branch-scope) cũng chỉ theo mã.** `allowedStudentCodes` thay cho `allowedPhones`; cohort theo lớp dùng `listStudentCodesInClasses` (mới) thay `listStudentPhonesInClasses`. Giữ nguyên nguyên tắc: chỉ chặn khi dòng nằm ngoài phạm vi, và scope được kiểm **trước** khi khớp.
4. **Bù lại việc mất fallback bằng một lý do bỏ qua riêng.** Nếu dòng không khớp mã **và** giá trị ở cột mã có dạng số điện thoại Việt Nam (`0` + 9–10 chữ số), lý do là `student_code_looks_like_phone` chứ không phải `student_not_found`. Đây là điều kiện cần để gỡ fallback mà không bỏ rơi người dùng: file cũ sẽ báo đúng bệnh ("cột mã đang là SĐT") thay vì 40 dòng "không tìm thấy học viên".
   - Kiểm **sau** khi tra theo mã: nếu một trung tâm dùng chính SĐT làm mã học viên (mã hợp lệ trùng dạng SĐT) thì vẫn khớp bình thường, không bị chặn.
5. **Bỏ khỏi contract những trường chỉ có nghĩa khi còn fallback**: `GRADE_IMPORT_MATCHED_BY`, `GradeImportMatchedBy`, `GradeImportMatchedByPhone`, `GradeImportResult.matchedByPhone`, `GradeImportPreviewRow.matchedBy`. Giữ chúng lại sẽ là trường luôn mang một giá trị duy nhất — dữ liệu chết, và người đọc sau sẽ tưởng fallback vẫn tồn tại.
6. **Bỏ khỏi store những method chỉ phục vụ fallback**: `listStudentPhonesInBranches`, `listStudentPhonesInClasses`. Giữ code chết trong interface là cách chắc chắn nhất để nó được dùng lại.

## Consequences

- **Phá vỡ có chủ ý**: file Excel cũ dùng SĐT ở cột mã sẽ **không còn nhập được**. Đây là mục tiêu, không phải tai nạn — nhưng phải nói rõ với trung tâm trước khi phát hành, và bản xem trước (dry-run) là nơi họ thấy điều đó trước khi ghi.
- File dùng SĐT giờ cho ra `student_code_looks_like_phone` trên từng dòng, kèm nhãn tiếng Việt rõ ràng ở UI. Việc sửa nằm ở file, không ở hệ thống.
- `importGrades`/`previewImportGrades` bớt một tham số (`allowedPhones`); số tham số còn 6 và 5. Không còn hai bảng tra phải giữ đồng bộ.
- SĐT vẫn là dữ liệu hạng nhất ở mọi chỗ khác (hồ sơ, hàng đợi chấm, liên hệ). Chỉ có đúng một chỗ nó không còn dùng: khoá khớp file import.
- Muốn quay lại fallback thì phải làm ngược ADR này (thêm lại bảng tra + contract + cảnh báo). Đừng "tạm" thêm fallback trong một nhánh phụ — đó chính là cách ADR 0019 ra đời.
- Việc chuẩn hoá dữ liệu vẫn còn: nếu còn học viên `student_code is null`, họ **không nhập điểm bằng file được** (không có mã để ghi vào cột). Đây là lý do `student_code` phải được cấp cho mọi học viên — xem `TODO(slice-23-b)` về bộ đếm mã.
