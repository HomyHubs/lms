# AGENTS.md — Users API

Nhật ký này thuộc riêng feature/nhánh này. Cập nhật liên tục, tối thiểu mỗi ngày làm việc, ngay cả khi task chưa xong.

## Bối cảnh feature

- Nhiệm vụ: CRUD người dùng (Admin/superadmin) + mã học viên (slice-23); map DB row -> AdminUser an toàn (không lộ password_hash).
- Slice/Task đã triển khai: slice-23 (`docs/tasks/slices/slice-23-ma-hoc-vien.md`), slice-26 (`docs/tasks/slices/slice-26-nguoi-dung-hien-thi.md`).
- Phụ thuộc: `@lms/shared` (`AdminUser`, `CreateUserRequest`…); `auth/index.js` (resolve phiên, bam mat khau); `platform/db` (Kysely).
- Owner hiện tại: Hoang Hoang HA

## Contract (cửa công khai — chốt trước, không đổi giữa chừng)

- `usersRoutes(app, { authStore, usersStore })`: `GET/POST /users`, `GET/PATCH/DELETE /users/:id` (chỉ Admin; role cao chỉ superadmin quản lý).
- `UsersStore` (service.ts): `listUsers/findUserById/findUserByPhone/createUser/updateUser/deleteUser` + slice-23 `findUserByStudentCode/assignStudentCode/branchCodeForUser`.
- `AdminUser.studentCode` (shared) chảy qua `toAdminUser` (map `row.student_code`).
- `AdminUser.age`: dẫn xuất ở backend, KHÔNG lưu DB. Từ ADR 0018: tính từ `birthDate` (chính xác), fallback `birthYear` (ước lượng ±1). Chỉ role `student` mới có tuổi.
- `AdminUser.birthDate` (`YYYY-MM-DD`) + `AdminUser.birthYear`: hai mức chính xác của CÙNG một dữ liệu. Có `birthDate` thì `birthYear` dẫn xuất từ nó.

## Nhật ký liên tục (thêm mục mới mỗi ngày, không ghi đè mục cũ)

### 2026-11-14 — slice-23 Mã học viên

**Đã xong**
- Sinh mã tự động khi tạo học viên (`createUser`): chỉ role `student`, tiền tố theo cơ sở (`branches.code`, fallback `HV`) + số thứ tự zero-pad 4 (vd `HN0001`/`HV0001`); role khác giữ `student_code = null`. `store.ts` thêm `student_code` vào `SAFE_COLUMNS`, `findUserByStudentCode`, `nextStudentCode`, `setStudentCode`, `branchCodeForUser`.
- `toAdminUser` map `studentCode` (read-only). Migration `20261120000001_users_student_code.sql` + rollback gate `scripts/student-code.integration.mjs` (up/down/up trên PG18 container).

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

### 2026-11-27 — Trả nợ `TODO(slice-26)`: tuổi chính xác theo `birth_date` (ADR 0018)

**Đã xong**
- Migration `20261127000000_users_birth_date.sql`: thêm `users.birth_date date` (nullable, additive, **không backfill** — không suy ra được ngày/tháng từ năm sinh).
- `apps/api/src/features/users/age.ts` (mới): `todayInVN`, `parseIsoDate`, `ageFromBirthDate`, `ageFromBirthYear`, `displayAge`. Hàm thuần, nhận `today` dạng `YYYY-MM-DD` để test tất định; mọi so sánh theo `Asia/Ho_Chi_Minh`.
- `service.ts`: `toAdminUser(row, today)` dùng `displayAge`; `birthYearOf` dẫn xuất `birth_year` từ `birth_date`; `createUser`/`updateUser` nhận `birthDate` và tự dẫn xuất `birthYear`. `listUsers/getUser/createUser/updateUser` nhận `today` (mặc định `todayInVN()`) để test bơm ngày cố định.
- `store.ts`: `SAFE_COLUMNS` đọc `birth_date` qua `to_char(..., 'YYYY-MM-DD')` (theo mẫu `attendance/store.ts`) để `pg` không trả `Date` lệch ngày. Đường GHI dùng `.returning('id')` rồi `readRow(id)` — không nhét biểu thức vào `RETURNING`.
- Xoá `TODO(slice-26)`. Nợ còn lại đổi tên thành `TODO(slice-26-b)`: dữ liệu cũ chỉ có năm sinh vẫn lệch ±1, không sửa được bằng code.

**Đã kiểm**
- `age.test.ts` (15 case): 3 ngày quanh sinh nhật, 29/02 năm không nhuận, ngày không tồn tại, ngày tương lai, chỉ-có-năm.
- `service.test.ts`: tuổi chính xác trước/sau sinh nhật, `birthDate` thắng `birthYear` lệch, xoá `birthDate` giữ `birthYear`.
- `store.integration.test.ts` (mới, cần `TEST_DATABASE_URL`): round-trip `birth_date` ra đúng chuỗi `YYYY-MM-DD`; `assignStudentCode` tuần tự theo `branches.code` trên Postgres thật (trước đây chỉ có hàm thuần được test).
- `packages/shared/src/users.test.ts` (mới, 14 case): ngày không có thật, ngày tương lai, cặp `birthDate`/`birthYear` lệch năm, payload cũ không có `birthDate` vẫn parse.

**Bước tiếp theo**
- Dữ liệu cũ chỉ có năm sinh: cần nhập bổ sung ngày sinh thật (việc dữ liệu, không phải code).
- FE hiển thị `~<tuổi>` + tooltip khi chỉ biết năm sinh (`UsersPage.formatAge`).

## Bàn giao phiên (điền khi dừng giữa chừng, dùng mẫu docs/ai-workflow/templates/session-handoff.md)
- —
