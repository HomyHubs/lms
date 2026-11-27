# AGENTS.md — Users (frontend)

Nhật ký này thuộc riêng feature/nhánh này. Cập nhật liên tục, tối thiểu mỗi ngày làm việc.

## Bối cảnh feature

- Nhiệm vụ: Trang quản lý người dùng (chỉ Admin) — danh sách + form tạo + cấu hình quyền sửa câu hỏi; hiển thị mã học viên (slice-23) và SĐT nhỏ dưới họ tên (slice-26).
- Slice/Task đã triển khai: slice-23 (`docs/tasks/slices/slice-23-ma-hoc-vien.md`), slice-26 (`docs/tasks/slices/slice-26-nguoi-dung-hien-thi.md`).
- Phụ thuộc: `@lms/shared` (`AdminUser` với `studentCode`/`age`/`birthDate`); API client `src/lib/api.ts` (`listUsers/createUser/updateUser/deleteUser`); hook `useUsers`.
- Owner hiện tại: Hoang Hoang HA

## Contract (cửa công khai — chốt trước, không đổi giữa chừng)

- `UsersPage`: bảng người dùng + form tạo + bảng quyền sửa câu hỏi (slice-19).
- `useUsers/useCreateUser/useUpdateUser/useDeleteUser` (useUsers.ts). Dữ liệu parse qua zod `AdminUserList` — không map tay.

## Nhật ký liên tục (thêm mục mới mỗi ngày, không ghi đè mục cũ)

### 2026-11-14 — slice-23 Mã học viên

**Đã xong**
- Thêm cột read-only "Mã học viên" vào bảng người dùng (`UsersPage.tsx`); hiện `u.studentCode` hoặc `—` khi trống (role khác học viên). `src/lib/api.ts` KHÔNG đổi: `listUsers` parse bằng zod `AdminUserList` nên `studentCode` (đã có ở contract) chảy qua tự động; `useUsers.ts` không đổi.
- Test `UsersPage.test.tsx`: stub thêm 1 học viên `studentCode: 'HN0001'` + 1 admin `studentCode: null`; assert header "Mã học viên" và giá trị `HN0001` render.

**Đang làm dở**
- Chỉ hiển thị (read-only); chưa có UI sửa/nhập tay mã học viên (để slice sau).

**Bước tiếp theo**
- Nếu thêm UI nhập mã: cần BE route PATCH hỗ trợ `studentCode` (hiện chưa có trong `UpdateUserRequest`).

### 2026-11-14 — slice-26 Hiển thị người dùng

**Đã xong**
- slice-26: bỏ cột "Số điện thoại" riêng trong bảng; SĐT hiển thị nhỏ (`text-xs text-slate-400`) ngay dưới họ tên trong ô "Họ tên".
- Cột "Tuổi" chỉ hiển thị cho role học viên (`u.role === 'student' ? (u.age ?? '—') : '—'`); role khác để "—".
- Test `UsersPage.test.tsx`: khẳng định không còn columnheader "Số điện thoại", SĐT học viên vẫn render, tuổi học viên hiện, giáo viên không hiện tuổi.

**Bước tiếp theo**
- Nhập/sửa `student_code` thủ công + chỉnh tuổi chính xác (birth_date) là slice sau.

### 2026-11-27 — Trả nợ `TODO(slice-26)`: nhập ngày sinh, tuổi chính xác (ADR 0018)

**Đã xong**
- Ô "Năm sinh" (`type=number`) → ô "Ngày sinh" (`type=date`, `aria-label="Ngày sinh"`); form gửi `birthDate` thay vì `birthYear`, backend tự dẫn xuất năm sinh.
- Cột "Năm sinh" hiện năm là chính, ngày sinh đầy đủ hiện nhỏ bên dưới (`text-xs text-slate-400`) — cùng mẫu "SĐT nhỏ dưới họ tên" của slice-26, không thêm cột mới.
- `formatAge(user)` (mới, trong `UsersPage.tsx`): chỉ học viên có tuổi; khi `birthDate === null` (chỉ biết năm sinh) hiển thị `~11` kèm `title` giải thích tuổi có thể lệch 1 — không trình bày số ước lượng như số chính xác.
- Test `UsersPage.test.tsx`: fixture thêm `birthDate`; thêm 1 học viên có ngày sinh (tuổi chính xác `10`), giữ 1 học viên chỉ có năm sinh (`~11`), khẳng định giáo viên không hiện tuổi (`36`/`~36` đều null).

**Bước tiếp theo**
- Dữ liệu cũ chỉ có năm sinh vẫn hiện `~<tuổi>` cho tới khi nhập bổ sung ngày sinh thật (`TODO(slice-26-b)`).

## Bàn giao phiên (điền khi dừng giữa chừng, dùng mẫu docs/ai-workflow/templates/session-handoff.md)
- —
