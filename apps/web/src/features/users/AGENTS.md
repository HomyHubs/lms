# AGENTS.md — Users (frontend)

Nhật ký này thuộc riêng feature/nhánh này. Cập nhật liên tục, tối thiểu mỗi ngày làm việc.

## Bối cảnh feature

- Nhiệm vụ: Trang quản lý người dùng (chỉ Admin) — danh sách + form tạo; hiển thị mã học viên (slice-23).
- Slice/Task đang triển khai: slice-23, xem `docs/tasks/slices/slice-23-ma-hoc-vien.md`.
- Phụ thuộc: `@lms/shared` (`AdminUser` với `studentCode`); API client `src/lib/api.ts` (`listUsers/createUser/updateUser/deleteUser`); hook `useUsers`.
- Owner hiện tại: Hoang Hoang HA
- Nhánh: feature/slice-23-ma-hoc-vien

## Contract (cửa công khai — chốt trước, không đổi giữa chừng)

- `UsersPage`: bảng người dùng + form tạo + bảng quyền sửa câu hỏi (slice-19).
- `useUsers/useCreateUser/useUpdateUser/useDeleteUser` (useUsers.ts).

## Nhật ký liên tục (thêm mục mới mỗi ngày, không ghi đè mục cũ)

### 2026-11-14 — slice-23 Mã học viên

**Đã xong**
- Thêm cột read-only "Mã học viên" vào bảng người dùng (`UsersPage.tsx`), ngay sau "Số điện thoại"; hiện `u.studentCode` hoặc `—` khi trống (role khác học viên). `src/lib/api.ts` KHÔNG đổi: `listUsers` parse bằng zod `AdminUserList` nên `studentCode` (đã có ở contract) chảy qua tự động; `useUsers.ts` không đổi.
- Test `UsersPage.test.tsx`: stub thêm 1 học viên `studentCode: 'HN0001'` + 1 admin `studentCode: null`; assert header "Mã học viên" và giá trị `HN0001` render.

**Đang làm dở**
- Chỉ hiển thị (read-only); chưa có UI sửa/nhập tay mã học viên (để slice sau).

**Bước tiếp theo**
- Nếu thêm UI nhập mã: cần BE route PATCH hỗ trợ `studentCode` (hiện chưa có trong `UpdateUserRequest`).

## Bàn giao phiên (điền khi dừng giữa chừng, dùng mẫu docs/ai-workflow/templates/session-handoff.md)
