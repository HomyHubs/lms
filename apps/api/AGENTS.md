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
- Feature `auth` (qua `src/features/auth/index.ts`):
  - Routes: `POST /auth/login` (rate limit 5/phút), `POST /auth/logout`, `GET /auth/me`, `POST /auth/forgot-password` (rate limit 3/phút), `POST /auth/reset-password` (rate limit 5/phút).
  - `authRoutes(app, { store, config, resetStore, emailSender })`.
  - Service: `login/logout/resolveSession`, `hashPassword/verifyPassword`, phiên opaque (`generateSessionToken/hashSessionToken`).
  - Task 3: `requestPasswordReset/resetPassword`, `generateOtp/hashOtp`, `MAX_OTP_ATTEMPTS`; store `makePasswordResetStore`; sender `makeConsoleEmailSender`.

## Nhật ký liên tục (thêm mục mới mỗi ngày, không ghi đè mục cũ)

### 2026-09-23

**Đã xong**

- slice-4 (Tạo đề & Thi online) — xử lý finding review **N001** "hết giờ giữa chừng bị khóa nộp": bỏ chặn `deadline_passed` trong `submitAttempt`; hết giờ vẫn cho nộp (ép nộp), chỉ tính đáp án các câu thuộc đề đã làm. Bỏ `deadline_passed` khỏi `SubmitAttemptOutcome` và khỏi map lỗi ở `routes.ts`.
- Viết lại unit test deadline thành "qua deadline vẫn cho nộp (ép nộp) — chỉ tính câu đã làm" (`service.test.ts`).
- **N003** (đua khi `startAttempt` chạy song song → resume thay vì lỗi 500) đã xử lý cùng commit, kèm 2 unit test.
- Commit `b18e667`. Cổng gác toàn repo XANH: `pnpm -r build && lint && typecheck && test` — apps/api 118 test pass (exams: service 16 + routes 9), shared 14, web 12.

**Đang làm dở**

- (không cho N001) — code + test đã xong, đã commit, cổng gác xanh.

**Bước tiếp theo**

- Finding còn lại của slice-4: N002 (GET /exams chưa lọc theo lịch/lớp — để khi có assignment), N004 (info).
- V002: chạy `dbmate migrate` cho migration exams trên Postgres thật (đang là TODO(slice-4)).
- Tiếp tục review/PR slice-4 vào `dev`.

### 2026-09-14

**Đã xong**

- Dựng khung apps/api: Fastify 5 + helmet/cors/rate-limit, config qua Zod, Postgres qua Kysely.
- Health-check gọi `select 1` tới Postgres THẬT (không mock), đo latency, trả `HealthResponse`.
- Unit test cho `checkHealth` (nhánh up/down).
- Task 2: feature `auth` — đăng nhập SĐT + mật khẩu (bcrypt), phiên Session opaque (chỉ lưu SHA-256 hash token), chống liệt kê tài khoản; routes login/logout/me; `@fastify/cookie`; seed admin.
- Task 3: quên mật khẩu qua OTP Email — `password-reset.ts` (OTP 6 số qua crypto, hash SHA-256, TTL 10 phút, giới hạn nhập sai, one-time), `email.ts` (sender dev log), store `makePasswordResetStore`, routes `forgot-password`/`reset-password` (rate limit); config `PASSWORD_RESET_OTP_TTL_SECONDS`. Unit test service + route test (forgot/reset).

**Đang làm dở**

- (không) — phần API của slice-0 (Task 1-3) hoàn tất. Email OTP mới chỉ log ở dev (TODO cắm provider thật).

**Bước tiếp theo**

- Chạy migrate + seed trên Postgres thật, kiểm tra end-to-end; chuẩn bị PR slice-0 vào `dev`.

## Bàn giao phiên (điền khi dừng giữa chừng, dùng mẫu docs/ai-workflow/templates/session-handoff.md)
