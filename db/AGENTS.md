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

**Đang làm dở**
- (không).

**Bước tiếp theo**
- Task 2 (phiên sau): migration tạo bảng `users` (id, phone_number, password_hash, role) — không lưu plain text.

## Bàn giao phiên (điền khi dừng giữa chừng, dùng mẫu docs/ai-workflow/templates/session-handoff.md)
