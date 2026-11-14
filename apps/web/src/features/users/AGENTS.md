# AGENTS.md — users (web)

Nhật ký này thuộc riêng feature/nhánh này. Cập nhật liên tục, tối thiểu mỗi ngày làm việc, ngay cả khi task chưa xong.

## Bối cảnh feature

- Nhiệm vụ: màn Quản lý người dùng (danh sách + tạo user + cấu hình quyền sửa câu hỏi).
- Slice/Task đang triển khai: slice-26, xem `docs/tasks/slices/slice-26-nguoi-dung-hien-thi.md`
- Phụ thuộc: `@lms/shared` (AdminUser/AdminUserList), `useUsers` (react-query), `/users` API.
- Owner hiện tại: Hoang Hoang HA
- Nhánh: feature/slice-26-nguoi-dung-hien-thi

## Contract (cửa công khai)

- `UsersPage` (React component). Dữ liệu qua `useUsers`/`api.ts` dùng zod `AdminUserList` — không map tay.

## Nhật ký liên tục

### 2026-11-14

**Đã xong**
- slice-26: bỏ cột "Số điện thoại" riêng trong bảng; SĐT hiển thị nhỏ (`text-xs text-slate-400`) ngay dưới họ tên trong ô "Họ tên".
- Cột "Tuổi" chỉ hiển thị cho role học viên (`u.role === 'student' ? (u.age ?? '—') : '—'`); role khác để "—".
- `api.ts` KHÔNG đổi (parse qua zod `AdminUserList`, `age` là field dẫn xuất sẵn có).
- Test `UsersPage.test.tsx`: khẳng định không còn columnheader "Số điện thoại", SĐT học viên vẫn render, tuổi học viên hiện, giáo viên không hiện tuổi.

**Đang làm dở**
- —

**Bước tiếp theo**
- Nhập/sửa `student_code` thủ công + chỉnh tuổi chính xác (birth_date) là slice sau.

## Bàn giao phiên

- —
