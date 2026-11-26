# Slice 29 — Ghi danh & Quản lý (thay đổi trang "Gán cơ sở")

- Cơ chế: Dọc
- Owner hiện tại: —
- Nhánh: —
- PR: —
- Trạng thái: xem `../MVP-BACKLOG.md` (nguồn trạng thái duy nhất)
- Phụ thuộc: slice-1 (User, Branch & phân quyền)
- Sửa mục gốc: — (tính năng mới; đặc tả mục 12; đổi tên từ "Gán cơ sở")

## Mục tiêu bấm được / nghiệm thu được
- Menu và tiêu đề trang đổi từ "Gán cơ sở" thành **"Ghi danh & Quản lý"**, vẫn ở `/assignments`, vẫn chỉ Admin.
- **Panel 1 — Học viên & giáo viên theo lớp:** chọn một lớp → thấy danh sách học viên đang học (gỡ được) và giáo viên phụ trách (gỡ được); thêm học viên vào lớp (ghi danh) và gán giáo viên cho lớp ngay tại chỗ.
- **Panel 2 — Quản lý theo cơ sở:** chọn một tài khoản quản lý (admin/staff) → tick cơ sở được gán → Lưu (giữ nguyên hành vi cũ, chỉ thu hẹp danh sách người dùng cho đúng nghĩa "quản lý").
- Mọi thao tác gọi API thật đã có: `POST /enrollments`, `DELETE /enrollments/:id`, `POST/DELETE /classes/:id/teachers`, `PUT /users/:id/branches`; lỗi hiển thị bằng message của server.

## Task
| # | Task | Tầng | Ghi chú |
| --- | --- | --- | --- |
| 0 | Xác minh API đã đủ: ghi danh (`catalog`), giáo viên lớp (`attendance`), gán cơ sở (`userbranches`) — tất cả `requireAdmin` + branch-scope | API | Không thêm endpoint mới ở slice này |
| 1 | `apps/web/src/features/userbranches/AssignmentsPage.tsx`: dựng lại 2 panel; panel 1 dùng `useClasses`, `useEnrollments`, `useCreateEnrollment`, `useDeleteEnrollment`, `useClassTeachers`, `useAssignTeacher`, `useRemoveTeacher` | FE | Tái dùng hook sẵn có, không nhân bản logic |
| 2 | Panel 2: lọc người dùng theo role `admin`/`staff`, giữ tick cơ sở + Lưu như cũ | FE | Hành vi cũ giữ nguyên |
| 3 | `apps/web/src/components/layout/nav.ts`: đổi nhãn menu `Gán cơ sở` → `Ghi danh & Quản lý` | FE | Không đổi path/quyền |
| 4 | `AssignmentsPage.test.tsx`: cập nhật tiêu đề mới; thêm case chọn lớp → hiện học viên + giáo viên, ghi danh phát `POST /api/enrollments`, gỡ học viên phát `DELETE`; case panel quản lý lưu `PUT /api/users/:id/branches` | FE | — |

## Stub cho phép
- Hiển thị tên người dùng: ưu tiên họ tên, thiếu thì dùng SĐT (không bịa tên).
- Chưa cần phân trang/lọc nâng cao trong danh sách lớp và người dùng.

## Không được stub
Xác thực, phân quyền, hạn mức, chuỗi hiển thị — trừ khi ghi khác trong ADR.
Ngoài ra: không giả lập ghi danh/gán giáo viên ở client; mọi thay đổi phải qua API và làm mới danh sách từ server.

## Nợ kỹ thuật
| Marker | Vị trí | Nội dung | Dự kiến trả |
| --- | --- | --- | --- |
| TODO(slice-29) | `AssignmentsPage.tsx` | Danh sách lớp/người dùng tải toàn bộ (không phân trang) — chậm khi dữ liệu lớn | Khi số lớp > 200 |
| TODO(slice-29) | `AssignmentsPage.tsx` | Chưa hỗ trợ gán nhiều lớp một lúc (bulk) | Khi chủ dự án yêu cầu |

## Nhật ký thay đổi phạm vi của riêng Slice/Task này
| Ngày | Loại | Nội dung | Lý do | ADR |
| --- | --- | --- | --- | --- |
| 2026-11-26 | Tạo | Khởi tạo file slice từ yêu cầu mục 12 (đổi tên từ Gán cơ sở) | Lập kế hoạch thực thi | — |

## Cách nghiệm thu
- Thủ công: menu hiện "Ghi danh & Quản lý"; mở trang thấy 2 panel.
- Thủ công: chọn lớp → thấy học viên + giáo viên hiện có; ghi danh 1 học viên mới → xuất hiện ngay; gỡ → biến mất; gán/gỡ giáo viên tương tự.
- Thủ công: panel quản lý chỉ liệt kê admin/staff; tick cơ sở và Lưu → tải lại vẫn đúng.
- Test tự động: `AssignmentsPage.test.tsx` (heading mới, panel 1 ghi danh/gỡ, panel 2 lưu cơ sở).

## Bàn giao phiên gần nhất

- 2026-11-26: Hoàn tất (FE-only — API đã đủ từ slice-1/slice-6).
- `AssignmentsPage.tsx` dựng lại thành 2 panel: (1) Học viên & giáo viên theo lớp — dùng `useEnrollments`/`useCreateEnrollment`/`useDeleteEnrollment` + `useClassTeachers`/`useAssignTeacher`/`useRemoveTeacher`; (2) Quản lý theo cơ sở — chỉ liệt kê `admin`/`staff`, giữ tick + Lưu như cũ.
- `nav.ts`: nhãn menu `Gán cơ sở` → `Ghi danh & Quản lý` (giữ path `/assignments`, vẫn chỉ Admin).
- Test `AssignmentsPage.test.tsx` (3 case): heading + chỉ admin/staff ở panel quản lý; ghi danh phát `POST /api/enrollments` đúng body; lưu cơ sở phát `PUT /api/users/:id/branches` đúng body.
- Toàn bộ 102 test web PASS; typecheck + eslint `--max-warnings=0` PASS.
- Lưu ý khi test: query "cơ sở đã gán" resolve sau khi checkbox đã render, nên test phải chờ hết "Đang tải…" trước khi tick (nếu không effect sẽ ghi đè lựa chọn).
