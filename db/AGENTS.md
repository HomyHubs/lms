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

## Bàn giao phiên (điền khi dừng giữa chừng, dùng mẫu docs/ai-workflow/templates/session-handoff.md)
