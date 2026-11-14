# AGENTS.md — users (api)

Nhật ký này thuộc riêng feature/nhánh này. Cập nhật liên tục, tối thiểu mỗi ngày làm việc, ngay cả khi task chưa xong.

## Bối cảnh feature

- Nhiệm vụ: CRUD người dùng (Admin), map DB row -> AdminUser an toàn (không lộ password_hash).
- Slice/Task đang triển khai: slice-26, xem `docs/tasks/slices/slice-26-nguoi-dung-hien-thi.md`
- Phụ thuộc: `@lms/shared` (AdminUser contract), store Kysely trên Postgres.
- Owner hiện tại: Hoang Hoang HA
- Nhánh: feature/slice-26-nguoi-dung-hien-thi

## Contract (cửa công khai)

- `listUsers`, `getUser`, `createUser`, `updateUser`, `deleteUser` (service.ts); `UsersStore` interface.
- `AdminUser.age`: dẫn xuất ở backend, KHÔNG lưu DB.

## Nhật ký liên tục

### 2026-11-14

**Đã xong**
- slice-26: `toAdminUser()` chỉ tính `age` cho role học viên (`row.role === 'student' && birthYear != null`); role khác luôn `age = null` dù có `birth_year`.
- Thêm `TODO(slice-26)`: tuổi tính từ `birth_year` sai lệch ±1; cần cột `birth_date` (migration + slice sau) nếu muốn chính xác.
- Test `service.test.ts`: thêm case học viên có tuổi, giáo viên có birthYear nhưng age = null.

**Đang làm dở**
- —

**Bước tiếp theo**
- Chỉ đụng cách tính/hiển thị; không đổi dữ liệu DB.

## Bàn giao phiên

- —
