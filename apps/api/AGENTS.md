# AGENTS.md — apps/api (backend Fastify)

Nhật ký này thuộc riêng feature/nhánh này. Cập nhật liên tục, tối thiểu mỗi ngày làm việc, ngay cả khi task chưa xong.

## Bối cảnh feature

- Nhiệm vụ: Backend Fastify + TypeScript cho LMS. Slice-0 dựng khung + endpoint health-check nối thông FE-BE-DB thật (Postgres qua Kysely).
- Slice/Task đang triển khai: slice-4, xem `docs/tasks/slices/slice-4-tao-de-thi-online.md`
- Phụ thuộc module nào, qua cửa công khai nào: `@lms/shared` (contract `HealthResponse`).
- Owner hiện tại: An Vo
- Nhánh: feature/slice-4-tao-de-thi-online

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

### 2026-11-14

**Đã xong**

- slice-12 (Hình ảnh câu hỏi): feature mới `media` — `POST /media` (Admin/GV, body raw `application/octet-stream` ≤ 2MB, kiểm magic bytes PNG/JPEG/WebP/GIF, ≤ 4000×4000, gỡ metadata PNG/JPEG, khử trùng sha256), `GET /media/:id` (manager mọi ảnh; học viên chỉ ảnh trong lượt thi của mình, còn lại 404; `private` cache + `nosniff`), `GET/PUT /questions/:id/media` (thay cả danh sách; trigger `23001` → 409). `MediaStorage` driver local (`MEDIA_DIR`). `exams`: câu hỏi kèm `stemImages`/`optionImages`, xáo đáp án thì ảnh đi theo, `createAttempt` ghi `exam_attempt_media` trong transaction. Xem ADR 0013.

### 2026-11-12

**Đã xong**

- slice-11a (Bộ đề cố định): feature mới `examsets` (Admin/GV) — `GET/POST /exam-sets`, `GET/PATCH/DELETE /exam-sets/:id` (chỉ nháp), `PUT /:id/items`, `POST /:id/questions` (soạn câu trắc nghiệm/đúng-sai, `source = exam_set`), `/:id/publish` (kiểm từng câu), `/:id/archive`, `/:id/duplicate`; lỗi trigger `23001` → 409. `exams`: `mode = random | fixed_set`, `createExam` nhận 1..10 bộ đã phát hành, `startAttempt` nhánh fixed (`arrangeFixedPaper`: xáo câu/đáp án, thi lại không trùng thứ tự; `alternate_sets` lấy bộ kế tiếp). Câu `exam_set` không vào đề random; sửa/xoá câu bị bộ đề giữ → 409 `held_by_exam_set`. Xem ADR 0011.

### 2026-11-11

**Đã xong**

- slice-9b (Thông báo): feature `notifications` — quét nhắc thi lại + buổi dạy 24 giờ tới → enqueue vào bảng `notifications` (dedupe key) → gửi qua `NOTIFY_CHANNEL` (whatsapp|telegram|console, dùng lại helper `sendWhatsAppText`/`sendTelegramText` của `auth`), thử lại tối đa 3 lần. Lịch trong process mỗi `NOTIFY_INTERVAL_MINUTES` (mặc định 15, 0 = tắt, không chạy khi test). `GET /notifications`, `POST /notifications/:id/read`, `POST /notifications/read-all`, `POST /notifications/run` (Admin). Xem ADR 0010.

### 2026-11-10

**Đã xong**

- slice-9a (Chấm tay Speaking/Writing): feature `exams` thêm `GET /grading/attempts`, `GET /grading/attempts/:attemptId`, `POST /grading/attempts/:attemptId/grade` (Admin/GV). Điểm từng câu 0..điểm tối đa, ngưỡng đạt đóng băng của đề, ghi một lần (người chấm đầu tiên thắng), `ExamResult.feedback` cho học viên. Xem ADR 0009.

### 2026-11-08

**Đã xong**

- slice-8 (Ngày công & giờ dạy) — feature `workhours` (`workHoursRoutes(app, { rbac, workHoursStore, branchScope, now? })`): `POST /timesheet/check-in` (201; 409 khi đã có ca mở), `POST /timesheet/check-out` (409 khi không có ca mở), `GET /me/timesheet?month` (staff + teacher), `GET /reports/work-hours?month&branchId` (admin, trong phạm vi cơ sở; ngoài phạm vi → 404). Buổi "đã dạy" = không huỷ + có điểm danh, GV dạy = người ghi điểm danh; ngày công theo ngày Asia/Ho_Chi_Minh; ADR 0007. Feature `attendance`: buổi có `durationMinutes`, `makeupForSessionId` (chỉ bù cho buổi chưa dạy cùng lớp, sai → 400), `POST /sessions/:id/cancel` (GV phụ trách; đã điểm danh → 409), PUT điểm danh buổi đã huỷ → 409.

### 2026-11-07

**Đã xong**

- slice-7 (Xếp loại & Dashboard) — feature `reports` (`reportsRoutes(app, { rbac, reportsStore, branchScope })`): `GET /reports/classification-policies`, `PUT /reports/classification-policies/:levelId` (400 sai cấu hình, 404 cấp độ không tồn tại), `GET /reports/students?branchId&levelId&classId&from&to` (chỉ admin, trong phạm vi cơ sở được gán; cơ sở ngoài phạm vi → 404). Công thức: điểm tổng = trọng số thi × điểm thi (lượt tốt nhất mỗi đề) + trọng số chuyên cần × tỷ lệ chuyên cần slice-6; ADR 0006. Shared types `ClassificationPolicy*` (tách khỏi `GradingPolicy` của `/exam-policies`).
- Test: `reports/service.test.ts`, `routes.test.ts`, `store.integration.test.ts` (Postgres thật). Mutation check: đảo trọng số trong `finalScore` → test đỏ, revert → xanh.

### 2026-11-06

**Đã xong**

- slice-4.5 (Sinh prompt AI & import ngược) — feature `aigeneration` (`aiGenerationRoutes(app, { rbac, aiGenerationStore })`): `POST/GET /ai-requests`, `GET /ai-requests/:id`, `POST /ai-requests/:id/results`, `PATCH /ai-requests/:id/items/:itemId`, `POST /ai-requests/:id/save`. Admin xem tất cả, GV chỉ của mình (khác → 404). Không gọi AI provider; validate dùng lại validator slice-3 + phải khớp level/skill/type/difficulty. Lưu vào `questions` với `source = ai_generated` trong 1 transaction. Thiết kế: ADR 0005.
- Test: `aigeneration/routes.test.ts` (luồng đủ + RBAC + validate), `store.integration.test.ts` (Postgres thật). Mutation check: đổi chuyển trạng thái `imported/reviewed` → test đỏ, revert → xanh.

### 2026-11-05

**Đã xong**

- slice-6 (Điểm danh) — feature `attendance` (`attendanceRoutes(app, { rbac, attendanceStore, branchScope })`): Admin gán giáo viên cho lớp (`/classes/:id/teachers`), GV phụ trách tạo buổi học + điểm danh (`/classes/:id/sessions`, `PUT /sessions/:id/attendance`), học viên xem `/me/attendance`, Admin xem `/attendance/students/:id` + `/attendance/rates`. Migration `20261105000000_attendance.sql` (3 bảng mới, down/up đã chạy trên Postgres thật). Công thức tỷ lệ chuyên cần: ADR 0004.
- Test: `attendance/service.test.ts` (công thức), `routes.test.ts` (RBAC + nghiệm thu), `store.integration.test.ts` (Postgres thật).

**Bước tiếp theo**

- slice-7 dùng `summarize`/`GET /attendance/rates` làm đầu vào xếp loại.

### 2026-09-23

**Đã xong**

- slice-4 (Tạo đề & Thi online) — xử lý finding review **N001** "hết giờ giữa chừng bị khóa nộp": bỏ chặn `deadline_passed` trong `submitAttempt`; hết giờ vẫn cho nộp (ép nộp), chỉ tính đáp án các câu thuộc đề đã làm. Bỏ `deadline_passed` khỏi `SubmitAttemptOutcome` và khỏi map lỗi ở `routes.ts`.
- Viết lại unit test deadline thành "qua deadline vẫn cho nộp (ép nộp) — chỉ tính câu đã làm" (`service.test.ts`).
- **N003** (đua khi `startAttempt` chạy song song → resume thay vì lỗi 500) đã xử lý cùng commit, kèm 2 unit test.
- Commit `b18e667`. Cổng gác toàn repo XANH: `pnpm -r build && lint && typecheck && test` — apps/api 118 test pass (exams: service 16 + routes 9), shared 14, web 12.
- **N002** (GET /exams lọc theo vai trò): thêm `isExamOpenAt` + `listOpenExams` (`service.ts`); `GET /exams` phân nhánh theo role — học viên chỉ thấy đề đang mở trong cửa sổ lịch (`opens_at..closes_at`), quản trị (Admin/Teacher/Staff) vẫn xem toàn bộ qua `listExams`. Kèm 2 unit test + 2 route test. Cổng gác `@lms/api` XANH: lint + typecheck + 122 test pass (exams: service 18 + routes 11). Không đổi contract (`ExamList` giữ nguyên).

**Đang làm dở**

- (không) — N001/N003 đã commit (`b18e667`); N002 code + test xong, cổng gác xanh, commit ngay sau khi cập nhật nhật ký.

**Bước tiếp theo**

- Finding còn lại của slice-4: N004 (info). N002 đã xử lý (xem mục Đã xong); gán đề theo lớp/học viên (assignment) hoãn → sau MVP.
- V002 đã đóng: CI dùng PostgreSQL thật, chạy migration + integration exams + rollback/re-apply; guard xanh trên `ca45ef8`.
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

### 2026-09-27 — xử lý review PR #6

**Đã xong**

- Thêm `store.integration.test.ts` chạy với PostgreSQL thật: Kysely store round-trip, hai start đồng thời chỉ tạo một attempt, student-safe view và submit sau deadline.
- CI cấp PostgreSQL service, chạy migration trước test và xác minh migration mới nhất down/up.

**Bước tiếp theo**

- CI guard đã xanh trên `ca45ef8`; review lại đúng HEAD bằng identity độc lập.
