# AGENTS.md — db (migrations)

Nhật ký này thuộc riêng feature/nhánh này. Cập nhật liên tục, tối thiểu mỗi ngày làm việc.

## Bối cảnh feature

- Nhiệm vụ: Quản lý schema Postgres qua dbmate (SQL migrations, đảo ngược được).
- Slice/Task đang triển khai: slice-0, xem `docs/tasks/slices/slice-0-nen-tang-auth.md`
- Phụ thuộc: Postgres từ `compose.dev.yml`; đọc `DATABASE_URL` từ `.env` gốc repo.
- Owner hiện tại: An Vo
- Nhánh: feature/slice-0-nen-tang-auth

## Contract (cửa công khai — chốt trước, không đổi giữa chừng)

- Migrations nằm ở `db/migrations/*.sql`, mỗi file có `-- migrate:up` và `-- migrate:down` (đảo ngược được).
- Lệnh: `pnpm --filter @lms/db migrate` (up), `... migrate:down`, `... migrate:new <ten>`.

## Nhật ký liên tục (thêm mục mới mỗi ngày, không ghi đè mục cũ)

### 2026-09-14

**Đã xong**

- Thêm migration khởi tạo `20260914000000_init.sql` (bảng `app_meta` để xác minh đường ống migration end-to-end).
- Task 2: thêm migration `20260914010000_users_auth.sql` — bảng `users` (id, phone_number unique, password_hash, role mặc định `admin`) và bảng `sessions` (token_hash làm PK, user_id, expires_at) cho cơ chế Session opaque. Không lưu plain text; chỉ lưu bcrypt hash của mật khẩu và SHA-256 hash của token phiên. Cả hai đảo ngược được (`migrate:down`).
- Task 3: thêm migration `20260914015000_users_add_email.sql` (additive — cột `email` nullable + partial unique index) và `20260914020000_password_reset_otps.sql` (bảng OTP: `otp_hash` SHA-256, `attempts`, `consumed_at`, `expires_at`, FK tới `users`). Không lưu OTP thô. Cả hai đảo ngược được.

**Đang làm dở**

- (không) — schema slice-0 (Task 1-3) hoàn tất.

**Bước tiếp theo**

- Chạy `pnpm --filter @lms/db migrate` trên Postgres thật khi có DB; slice-1 sẽ mở rộng Branch/role.

### 2026-09-16

**Đã xong (slice-1)**

- `20260916000000_users_roles.sql` (Task 1): CHECK constraint role ∈ (admin/teacher/student/staff) + bỏ default; giải quyết TODO(slice-1) ở migration users_auth.
- `20260916010000_centers_branches.sql` (Task 2): bảng `centers` + `branches` (1 Center → nhiều Branch, `branches.center_id` cascade). Đảo ngược được.
- `20260916020000_levels_courses_classes_enrollments.sql` (Task 3): `levels` (seed Starter/Mover/Flyer) → `courses` → `classes` (mỗi Class gắn 1 `branch_id`) → `enrollments` (unique class+student, FK cascade). Đảo ngược được.
- `20260916030000_user_branches.sql` (Task 4): bảng nối `user_branches` (PK user_id+branch_id, cascade) cho branch-scoped access. Đảo ngược được.
- Tất cả additive (mục 16): không sửa migration đã merge.

**Đang làm dở**

- Chưa chạy `dbmate up` + seed trên Postgres thật cho 4 migration slice-1 (làm khi có DB).

**Bước tiếp theo**

- Sau khi PR slice-1 merge: chạy `pnpm --filter @lms/db migrate` + seed trên Postgres thật, kiểm tra rollback (`migrate:down`).

## Bàn giao phiên (điền khi dừng giữa chừng, dùng mẫu docs/ai-workflow/templates/session-handoff.md)
