# Slice 23 — Mã học viên / mã user chuẩn hóa

- Cơ chế: Dọc
- Owner hiện tại: —
- Nhánh: —
- PR: —
- Trạng thái: xem `../MVP-BACKLOG.md` (nguồn trạng thái duy nhất)
- Phụ thuộc: slice-1 (User, Branch & phân quyền)
- Sửa mục gốc: — (tính năng mới; đặc tả mục 5.1 + 9.1 phần mã; theo `docs/adr/0014-student-code.md`)

## Mục tiêu bấm được / nghiệm thu được
- Mỗi học viên có `student_code` ổn định, sinh tự động theo cơ sở (ví dụ `HN0001`), tách khỏi số điện thoại; SĐT vẫn là khóa đăng nhập, không đổi.
- Chỉ role học viên mới có mã; tạo học viên mới sẽ tự sinh mã, còn role khác (admin/teacher/staff) không có mã.
- Học viên hiện có được backfill mã trong cùng migration; migration chỉ THÊM (additive), đảo ngược được và đã test rollback.
- Import điểm khớp học viên theo `student_code` là khóa chính thức (SĐT làm fallback chuyển tiếp); mã trùng hoặc không tìm thấy thì báo lỗi theo dòng, không ghi nhầm.
- Màn Người dùng hiển thị được mã học viên (read-only ở slice này).

## Task
| # | Task | Tầng | Ghi chú |
| --- | --- | --- | --- |
| 1 | Glob `**/migrations/*.sql` để định vị thư mục migration thực tế (`db/migrations/`) và đọc schema `users` hiện tại (`db/migrations/20260914010000_users_auth.sql`: base `users`; `20261115000001_users_profile_fields.sql`: `birth_year`, `first_name`, `last_name`, `gender`, `address`, `parent_phone`) + `branches` (`20260916010000_centers_branches.sql`), xác nhận chưa có `student_code` và chưa có cột tiền tố cơ sở | DB | Bắt buộc theo ADR 0014: xác minh schema + cách định danh học viên hiện tại TRƯỚC khi thiết kế migration |
| 2 | Tạo migration mới `db/migrations/<timestamp>_users_student_code.sql`: `alter table users add column if not exists student_code text` (nullable) + unique index một phần chỉ cho học viên; nếu `branches` chưa có tiền tố thì `add column if not exists code text` (nullable). Khối `-- migrate:down` drop đúng thứ tự ngược | DB | Chỉ THÊM (AGENTS.md mục 16), đảo ngược được |
| 3 | Backfill trong `-- migrate:up`: sinh `student_code` cho học viên hiện có theo tiền tố cơ sở (join `user_branches` → `branches.code`, fallback prefix chung) + số thứ tự zero-pad; viết và chạy test rollback (down xóa cột → up lại không lỗi) | DB | Nghiệm thu rollback là bắt buộc |
| 4 | `apps/api/src/features/users/store.ts`: thêm `'student_code'` vào `SAFE_COLUMNS`; thêm hàm sinh mã kế tiếp theo cơ sở + `findUserByStudentCode(code)` | API | `SAFE_COLUMNS` hiện chưa có `student_code` nên `GET` không trả về mã |
| 5 | `apps/api/src/features/users/service.ts`: `toAdminUser()` map thêm `studentCode: row.student_code`; `createUser()` khi role học viên thì tự sinh `student_code` (chỉ học viên) | API | Không sinh mã cho role khác |
| 6 | `apps/api/src/features/users/routes.ts`: `GET /users` và `GET /users/:id` trả thêm `studentCode`; không đụng luồng đăng nhập (SĐT) | API | CRUD đã có: `GET/POST /users`, `GET/PATCH/DELETE /users/:id` |
| 7 | `apps/api/src/features/exams/grade-import.ts` (`importGrades`, ~dòng 661) + `exams/service.ts`/`routes.ts` (hiện dựng `allowedPhones` qua `listStudentPhonesInBranches`, ~dòng 198): bổ sung khớp theo `student_code` làm khóa chính (thêm lookup kiểu `findStudentByCode`/`listStudentCodesInBranches`), giữ SĐT làm fallback; mã trùng/không thấy → lỗi theo dòng | API | Cột `studentCode` trong file import hiện thực chất đang là SĐT (~dòng 2373 `studentCode: code`) — slice này tách thành mã thật |
| 8 | `packages/shared/src/users.ts`: thêm `studentCode: string | null` vào `AdminUser` (và contract import nếu cần) để FE/BE dùng chung | Shared | Type dùng chung giữa hai đầu (AGENTS.md mục 17) |
| 9 | `apps/web/src/features/users/UsersPage.tsx` + `useUsers.ts`: hiển thị nhãn/cột `Mã học viên` (read-only) cho học viên | FE | `apps/web/src/lib/api.ts` map field mới — xem Integration notes (file dùng chung) |

## Stub cho phép
- UI nhập/sửa `student_code` thủ công có thể để slice sau; slice này chỉ cần sinh tự động + hiển thị read-only.
- Nếu sinh số thứ tự theo cơ sở phức tạp, tạm chấp nhận unique toàn hệ thống trước, tối ưu sequence theo cơ sở sau (ghi vào Nợ kỹ thuật).

## Không được stub
Xác thực, phân quyền, hạn mức, chuỗi hiển thị — trừ khi ghi khác trong ADR.
Ngoài ra: không stub việc khớp import (phải khớp thật theo `student_code` — xem ADR 0019) và không stub backfill (học viên cũ phải có mã thật).

## Nợ kỹ thuật
| Marker | Vị trí | Nội dung | Dự kiến trả |
| --- | --- | --- | --- |
| ~~TODO(slice-23)~~ | `apps/api/src/features/exams/service.ts` (import điểm) | ~~Khớp theo SĐT chỉ là fallback chuyển tiếp; gỡ khi mọi học viên đã có `student_code`~~ → **đã trả 2026-11-27 (ADR 0019)**: bỏ hẳn fallback, chỉ khớp theo `student_code`; SĐT ở lại như dữ liệu (cột `users.phone_number`, `GradingRow.student_phone`, hồ sơ, hàng đợi chấm) nhưng không còn là khoá khớp | Đã trả |
| ~~TODO(slice-23)~~ | `apps/api/src/features/users/store.ts` | ~~Sinh số thứ tự theo cơ sở khi tạo đồng thời có thể đụng trùng; cần khóa/retry~~ → **đã trả 2026-11-27**: `assignCodeWithRetry` sinh lại mã và thử lại khi unique violation, tối đa 5 lần | Đã trả |
| TODO(slice-23-b) | `apps/api/src/features/users/store.ts` (`nextCode`) | Tiền tố mã không có dấu phân cách nên hai cơ sở có `code` lồng nhau dùng chung bộ đếm: cơ sở `HV` và `HV1` → mã `HV10001` của cơ sở sau vẫn khớp `like 'HV%'`, bộ đếm của `HV` nhảy lên 10002. Unique index vẫn chặn trùng nên **không sinh mã trùng**, chỉ số thứ tự xấu đi | Cần đổi định dạng mã (vd `HV-0001`) + migrate mã đã cấp — slice riêng |

> **Bỏ hẳn fallback SĐT (quyết định 2026-11-27, ADR 0019).** Trong cùng ngày, sau khi hướng an toàn
> (giữ fallback + cảnh báo) được triển khai, chủ dự án chốt ngược lại: **gỡ hẳn fallback, giữ số điện
> thoại như dữ liệu bình thường**. Lý do: hai khoá cho một việc thì không bao giờ biết chắc dòng nào
> khớp vì lý do gì khi có sự cố, và "100% học viên có mã" là điều kiện không kiểm chứng được từ code —
> chờ nó là chờ vô hạn. Cảnh báo chỉ làm fallback dễ thấy hơn, không làm nó đúng hơn.
>
> Nay: `matchGradingRow(code, byCode)` chỉ tra theo mã; `importGrades`/`previewImportGrades` bỏ tham số
> `allowedPhones`; phạm vi tính theo `allowedStudentCodes` + `listStudentCodesInClasses` (mới). Contract
> bỏ `matchedByPhone`/`matchedBy` vì chúng chỉ có nghĩa khi còn fallback. Store bỏ
> `listStudentPhonesInBranches`/`listStudentPhonesInClasses` để không còn code chết.
>
> **Bù lại việc mất fallback:** dòng không khớp mã **và** giá trị ở cột mã có dạng SĐT Việt Nam
> (`0` + 9–10 chữ số, chịu được dấu cách/chấm/gạch) → lý do `student_code_looks_like_phone` thay vì
> `student_not_found`, UI hiện "Cột mã đang là số điện thoại — cần đổi sang mã học viên". Kiểm tra này
> chạy **sau** khi tra theo mã, nên trung tâm nào dùng chính SĐT làm mã học viên vẫn nhập được.
>
> **Kèm theo — sửa một lỗi thật của bản xem trước:** `previewImportGrades` trước đây CHỈ tra theo SĐT và chỉ
> soi phạm vi theo SĐT, nên file dùng **mã học viên** hiện `student_not_found`/`out_of_scope` ở bước xem trước
> trong khi bước ghi vẫn nhập được — xem trước nói dối. Nay hai bước dùng chung `matchGradingRow` và cùng
> nhận `allowedStudentCodes`, nên không thể lệch nhau nữa.

## Nhật ký thay đổi phạm vi của riêng Slice/Task này
| Ngày | Loại | Nội dung | Lý do | ADR |
| --- | --- | --- | --- | --- |
| 2026-11-12 | Tạo | Khởi tạo file slice từ yêu cầu 5.1 + 9.1 (mã) và ADR 0014 | Lập kế hoạch thực thi | 0014 |
| 2026-11-27 | Sửa | Gộp `nextStudentCode` + `setStudentCode` thành `assignStudentCode` có retry khi unique violation (`assignCodeWithRetry`); bỏ 2 method cũ khỏi `UsersStore` vì không còn nơi dùng | Trả nợ đụng trùng số thứ tự khi tạo đồng thời; tránh để lại method chết | 0014 |
| 2026-11-27 | Mở rộng | Tách `matchGradingRow` dùng chung cho `importGrades` + `previewImportGrades`; thêm `GradeImportResult.matchedByPhone` và `GradeImportPreviewRow.matchedBy`; preview nhận `allowedStudentCodes` | Làm lộ việc khớp bằng SĐT (hướng an toàn thay vì gỡ fallback) + sửa lỗi preview chỉ khớp theo SĐT | — |
| 2026-11-27 | Thu hẹp | Bỏ hẳn fallback SĐT: `matchGradingRow` chỉ tra theo mã; bỏ `allowedPhones` khỏi `importGrades`/`previewImportGrades`; bỏ `matchedByPhone`/`matchedBy` khỏi contract; thêm lý do `student_code_looks_like_phone`; store bỏ 2 helper SĐT, thêm `listStudentCodesInClasses` | Chủ dự án chốt: một khoá duy nhất, SĐT giữ làm dữ liệu chứ không làm khoá khớp | 0019 |

## Cách nghiệm thu
- Thủ công: chạy `migrate up` → cột `student_code` tồn tại và học viên cũ có mã dạng `HN0001`; chạy `migrate down` → cột biến mất; chạy `up` lại → không lỗi.
- Thủ công: `POST /users` role học viên → mã tự sinh; tạo user role khác → không có mã.
- Thủ công: import điểm bằng file có `student_code` đúng → khớp đúng học viên; mã sai/trùng → báo lỗi đúng dòng, không ghi điểm nhầm.
- Thủ công (ADR 0019): import file có **SĐT ở cột mã** → bản xem trước hiện cảnh báo "cột mã là số điện thoại", từng dòng báo `student_code_looks_like_phone`, nút xác nhận bị khoá, không ghi gì. Học viên có `student_code` trùng dạng SĐT vẫn nhập được bình thường.
- Test tự động: `apps/api/src/features/users/{store,service}.test.ts` cho sinh mã + map `studentCode`; test khớp import trong `exams` (service/grade-import) cho khóa `student_code` + lỗi theo dòng; test tích hợp migration rollback trên DB thật trong container.

## Bàn giao phiên gần nhất
