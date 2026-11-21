# AGENTS.md — Users API

Nhật ký này thuộc riêng feature/nhánh này. Cập nhật liên tục, tối thiểu mỗi ngày làm việc, ngay cả khi task chưa xong.

## Bối cảnh feature

- Nhiệm vụ: CRUD người dùng (Admin/superadmin) + mã học viên (slice-23); map DB row -> AdminUser an toàn (không lộ password_hash).
- Slice/Task đã triển khai: slice-23 (`docs/tasks/slices/slice-23-ma-hoc-vien.md`), slice-26 (`docs/tasks/slices/slice-26-nguoi-dung-hien-thi.md`).
- Phụ thuộc: `@lms/shared` (`AdminUser`, `CreateUserRequest`…); `auth/index.js` (resolve phiên, bam mat khau); `platform/db` (Kysely).
- Owner hiện tại: Hoang Hoang HA

## Contract (cửa công khai — chốt trước, không đổi giữa chừng)

- `usersRoutes(app, { authStore, usersStore })`: `GET/POST /users`, `GET/PATCH/DELETE /users/:id` (chỉ Admin; role cao chỉ superadmin quản lý).
- `UsersStore` (service.ts): `listUsers/findUserById/findUserByPhone/createUser/updateUser/deleteUser` + slice-23 `findUserByStudentCode/nextStudentCode/setStudentCode/branchCodeForUser`.
- `AdminUser.studentCode` (shared) chảy qua `toAdminUser` (map `row.student_code`).
- `AdminUser.age`: dẫn xuất ở backend, KHÔNG lưu DB.

## Nhật ký liên tục (thêm mục mới mỗi ngày, không ghi đè mục cũ)

### 2026-11-14 — slice-23 Mã học viên

**Đã xong**
- Sinh mã tự động khi tạo học viên (`createUser`): chỉ role `student`, tiền tố theo cơ sở (`branches.code`, fallback `HV`) + số thứ tự zero-pad 4 (vd `HN0001`/`HV0001`); role khác giữ `student_code = null`. `store.ts` thêm `student_code` vào `SAFE_COLUMNS`, `findUserByStudentCode`, `nextStudentCode`, `setStudentCode`, `branchCodeForUser`.
- `toAdminUser` map `studentCode` (read-only). Migration `20261120000000_users_student_code.sql` + rollback gate `scripts/student-code.integration.mjs` (up/down/up trên PG18 container).

**Đang làm dở**
- Hiển thị mã ở FE là read-only; chưa có UI sửa/nhập tay mã học viên (để slice sau).

**Bước tiếp theo**
- Grade-import (feature `exams`) đã khớp theo `student_code` làm khóa chính với SĐT fallback — xem `exams/AGENTS.md` mục slice-23.
- Nợ: sinh số thứ tự khi tạo đồng thời cùng prefix có thể trùng (`TODO(slice-23)` trong `store.ts`) — cần advisory lock/retry khi phát sinh trùng thực tế.

### 2026-11-14 — slice-26 Hiển thị người dùng

**Đã xong**
- slice-26: `toAdminUser()` chỉ tính `age` cho role học viên (`row.role === 'student' && birthYear != null`); role khác luôn `age = null` dù có `birth_year`.
- Thêm `TODO(slice-26)`: tuổi tính từ `birth_year` sai lệch ±1; cần cột `birth_date` (migration + slice sau) nếu muốn chính xác.
- Test `service.test.ts`: thêm case học viên có tuổi, giáo viên có birthYear nhưng age = null.

**Bước tiếp theo**
- Chỉ đụng cách tính/hiển thị; không đổi dữ liệu DB.

## Bàn giao phiên (điền khi dừng giữa chừng, dùng mẫu docs/ai-workflow/templates/session-handoff.md)
- —
