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

## Đang làm dở / còn thiếu

- Chưa viết code slice-1 — mới ở bước khởi tạo (docs-first).
- Nợ kỹ thuật kế thừa từ slice-0, xử lý khi chạm tới: chạy `dbmate migrate` + seed trên Postgres thật; cắm provider email thật cho OTP (TODO trong `email.ts`).

## Cổng gác đã chạy

- Chưa chạy cho slice-1 (chưa có thay đổi code). Sẽ chạy đầy đủ `pnpm -r build && pnpm -r lint && pnpm -r typecheck && pnpm -r test` cả cục bộ và trên CI trước khi mở PR.

## Bước tiếp theo

1. Task 1: CRUD User (Admin/Teacher/Student/Staff) + RBAC theo role, thay role giả định của slice-0.
2. Task 2: Quản lý Center + Branch (cơ sở) — CRUD, 1 Center có nhiều Branch.
3. Task 3: Level (Starter/Mover/Flyer) + Course + Class + Enrollment, mỗi Class gắn 1 Branch.
4. Task 4: bảng `UserBranch` (gán 1 hoặc nhiều Branch cho User) + lọc dữ liệu/menu theo Branch (branch-scoped access).

## Bàn giao phiên (nếu dừng giữa chừng)

Điền theo mẫu `../ai-workflow/templates/session-handoff.md`.
