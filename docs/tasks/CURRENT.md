# Task hiện tại (chỉ dùng khi làm tuần tự một mình)

Phạm vi sử dụng: CHỈ áp dụng khi đúng một người hoặc một agent làm việc, không có ai khác chạy song song trên repo này. Ngay khi có dev/agent thứ hai bắt đầu làm song song, ngừng cập nhật file này và chuyển hẳn sang dùng `MVP-BACKLOG.md` (cột Owner) và `AGENTS.md` của từng feature.

## Đang làm

- ID Slice/Task: slice-1 (Quản lý người dùng, cơ sở (Branch) & phân quyền)
- Cập nhật ngày: 2026-09-16
- Mô tả phạm vi: CRUD User (Admin/Teacher/Student/Staff) + RBAC theo role (thay role giả định của slice-0); quản lý Center + nhiều Branch (cơ sở); Level (Starter/Mover/Flyer) + Course + Class + Enrollment (mỗi Class gắn 1 Branch); bảng `UserBranch` gán 1 hoặc nhiều Branch cho User để lọc dữ liệu/menu theo Branch được gán (branch-scoped). Chi tiết: `slices/slice-1-user-branch-phan-quyen.md`.
- Nhánh làm việc: feature/slice-1-user-branch-phan-quyen (base = `dev` sau khi merge slice-0)

## Đã làm trong phiên gần nhất

- slice-0 (Nền tảng & Auth) đã merge vào `dev` qua PR #1 (merge commit `c10de1c`, 2026-09-16); ghi nhận **Done** trong `MVP-BACKLOG.md` và bảng rollup ở `../../AGENTS.md`.
- Khởi tạo slice-1: tạo nhánh `feature/slice-1-user-branch-phan-quyen` từ `dev`, chuyển backlog sang **Đang làm** (Owner: An Vo), điền Owner + nhánh vào file slice.
- **Task 1 (slice-1) — xong cục bộ, đã commit (chưa push):**
  - `@lms/shared`: mở rộng `UserRole` thành 4 vai trò (`admin`/`teacher`/`student`/`staff`); thêm contract CRUD user (`AdminUser`, `CreateUserRequest`, `UpdateUserRequest`, list/response) trong `users.ts`.
  - DB: migration additive `20260916000000_users_roles.sql` — thêm CHECK constraint cho `role` + bỏ default `'admin'` (giải quyết TODO(slice-1) ở migration users_auth).
  - API: feature mới `apps/api/src/features/users/` (service + store Kysely + routes) với RBAC guard thật — chỉ Admin được CRUD user (401/403 đúng), ghép vào `app.ts` dùng chung `authStore`.
  - Web: trang `Quản lý người dùng` (`/users`) + hooks/api; điều hướng ẩn/hiện theo role (link chỉ hiện với Admin, route `/users` chặn non-admin).
  - Test: unit (service) + route (RBAC + CRUD) ở API; test render danh sách ở web.

## Đang làm dở / còn thiếu

- Task 2: Quản lý Center + Branch (cơ sở) — CRUD, 1 Center có nhiều Branch.
- Task 3: Level (Starter/Mover/Flyer) + Course + Class + Enrollment, mỗi Class gắn 1 Branch.
- Task 4: bảng `UserBranch` (gán 1 hoặc nhiều Branch cho User) + lọc dữ liệu/menu theo Branch (branch-scoped access).
- Nợ kỹ thuật kế thừa từ slice-0, xử lý khi chạm tới: chạy `dbmate migrate` + seed trên Postgres thật; cắm provider email thật cho OTP (TODO trong `email.ts`).
- **Chưa push**: theo kế hoạch của chủ sở hữu, chỉ push nhánh lên `dev` (mở PR) SAU KHI hoàn tất cả 4 Task của slice-1.

## Cổng gác đã chạy

- Task 1: đã chạy `pnpm -r build && pnpm -r lint && pnpm -r typecheck && pnpm -r test` cục bộ — xanh. Sẽ chạy lại đầy đủ trên CI trước khi mở PR.

## Bước tiếp theo

1. Task 2: Quản lý Center + Branch (cơ sở) — CRUD, 1 Center có nhiều Branch.
2. Task 3: Level (Starter/Mover/Flyer) + Course + Class + Enrollment, mỗi Class gắn 1 Branch.
3. Task 4: bảng `UserBranch` + lọc dữ liệu/menu theo Branch (branch-scoped access).
4. Sau khi cả 4 Task xong: chạy cổng gác đầy đủ, cập nhật `MVP-BACKLOG.md` + rollup, rồi push nhánh & mở PR vào `dev`.

## Bàn giao phiên (nếu dừng giữa chừng)

Điền theo mẫu `../ai-workflow/templates/session-handoff.md`.
