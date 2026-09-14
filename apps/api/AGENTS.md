# AGENTS.md — apps/api (backend Fastify)

Nhật ký này thuộc riêng feature/nhánh này. Cập nhật liên tục, tối thiểu mỗi ngày làm việc, ngay cả khi task chưa xong.

## Bối cảnh feature

- Nhiệm vụ: Backend Fastify + TypeScript cho LMS. Slice-0 dựng khung + endpoint health-check nối thông FE-BE-DB thật (Postgres qua Kysely).
- Slice/Task đang triển khai: slice-0, xem `docs/tasks/slices/slice-0-nen-tang-auth.md`
- Phụ thuộc module nào, qua cửa công khai nào: `@lms/shared` (contract `HealthResponse`).
- Owner hiện tại: An Vo
- Nhánh: feature/slice-0-nen-tang-auth

## Contract (cửa công khai — chốt trước, không đổi giữa chừng)

- `GET /health` → `HealthResponse` (từ `@lms/shared`): trả `status`, `db.status`, `db.latencyMs`, `timestamp`. 200 khi DB up, 503 khi DB down.
- `buildApp({ config, db })` → `FastifyInstance` (dùng cho test và main).
- Feature `health`: `healthRoutes(app, db)`, `checkHealth(db)` qua `src/features/health/index.ts`.

## Nhật ký liên tục (thêm mục mới mỗi ngày, không ghi đè mục cũ)

### 2026-09-14

**Đã xong**
- Dựng khung apps/api: Fastify 5 + helmet/cors/rate-limit, config qua Zod, Postgres qua Kysely.
- Health-check gọi `select 1` tới Postgres THẬT (không mock), đo latency, trả `HealthResponse`.
- Unit test cho `checkHealth` (nhánh up/down).

**Đang làm dở**
- (không) — Task 1 của slice-0 hoàn tất phần API.

**Bước tiếp theo**
- Task 2 (phiên sau): bảng `users`, đăng nhập SĐT + mật khẩu (hash), session opaque, rate-limit login.

## Bàn giao phiên (điền khi dừng giữa chừng, dùng mẫu docs/ai-workflow/templates/session-handoff.md)
