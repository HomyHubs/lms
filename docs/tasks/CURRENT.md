# Task hiện tại (chỉ dùng khi làm tuần tự một mình)

Phạm vi sử dụng: CHỈ áp dụng khi đúng một người hoặc một agent làm việc, không có ai khác chạy song song trên repo này. Ngay khi có dev/agent thứ hai bắt đầu làm song song, ngừng cập nhật file này và chuyển hẳn sang dùng `MVP-BACKLOG.md` (cột Owner) và `AGENTS.md` của từng feature.

## Đang làm

- ID Slice/Task: slice-1 (Quản lý người dùng, cơ sở (Branch) & phân quyền)
- Cập nhật ngày: 2026-09-16
- Mô tả phạm vi: CRUD User (Admin/Teacher/Student/Staff) + RBAC theo role; quản lý Center + nhiều Branch (cơ sở); Level (Starter/Mover/Flyer) + Course + Class + Enrollment (mỗi Class gắn 1 Branch); bảng `UserBranch` gán 1 hoặc nhiều Branch cho User để lọc dữ liệu theo Branch (branch-scoped). Chi tiết: `slices/slice-1-user-branch-phan-quyen.md`.
- Nhánh làm việc: feature/slice-1-user-branch-phan-quyen (base = `dev` sau khi merge slice-0)
- Trạng thái: 4/4 Task xong cục bộ, cổng gác xanh → mở PR vào `dev`, đang chờ review.

## Đã làm trong phiên gần nhất

- **Task 1 — CRUD User + RBAC theo role (4 vai trò).** Commit `ef65263`.
- **Task 2 — Center + Branch CRUD + RBAC guard dùng chung.** Commit `b93a4a8`.
  - `@lms/shared`: contract Center/Branch. API: feature `access/` (`makeRbac.requireRole` gắn `request.sessionUser`) + feature `centers/` (Center + Branch CRUD, chỉ Admin). DB: `20260916010000_centers_branches.sql`. Web: `/centers`.
- **Task 3 — Level/Course/Class/Enrollment (mỗi Class gắn 1 Branch).** Commit `004a0f6`.
  - API feature `catalog/`; Level seed sẵn, Course thuộc Level, Class gắn 1 Branch, Enrollment unique (class, student). DB: `20260916020000_levels_courses_classes_enrollments.sql` (seed 3 Level). Web: `/catalog`.
- **Task 4 — UserBranch + branch-scoped access THẬT.** Commit `181517b`.
  - API feature `userbranches/` (GET/PUT `/users/:id/branches`, chỉ Admin) + đóng vai trò `BranchScope`. `catalog` lọc Class/Enrollment theo Branch được gán cho người gọi (Admin/Teacher/Student); tạo/sửa/xoá Class + Enrollment chỉ trong phạm vi Branch (403/404 khi ngoài phạm vi). DB: `20260916030000_user_branches.sql`. Web: `/assignments`.

## Đang làm dở / còn thiếu

- Nợ kỹ thuật kế thừa từ slice-0/1, xử lý khi chạm tới: chạy `dbmate migrate` + seed trên Postgres thật (4 migration mới của slice-1 chưa chạy trên DB thật); cắm provider email thật cho OTP (TODO trong `email.ts`).
- Ghi chú thiết kế branch-scoped (để reviewer cân nhắc): danh sách Branch (`GET /branches`) hiện vẫn trả đầy đủ cho Admin (cấu hình tổ chức + phục vụ trang gán cơ sở); phần "dữ liệu theo Branch" được lọc thực ở tầng Class/Enrollment (đúng kịch bản nghiệm thu: Admin A chỉ thấy lớp của Branch 1).

## Cổng gác đã chạy

- Toàn slice-1 (Task 1–4): đã chạy `pnpm -r build && pnpm -r lint && pnpm -r typecheck && pnpm -r test` cục bộ — xanh (shared 14 test, api 74 test, web 9 test). Sẽ chạy lại đầy đủ trên CI trước khi merge.

## Bước tiếp theo

1. Push nhánh & mở PR vào `dev`, chạy quy trình review (skill `claude-review-loop`).
2. Sau khi review pass + merge: chuyển `MVP-BACKLOG.md` sang Done, xoá Owner, điền PR, cập nhật bảng rollup ở `../../AGENTS.md`.
3. Chạy `dbmate migrate` + seed trên Postgres thật để kiểm tra 4 migration slice-1 end-to-end.

## Bàn giao phiên (nếu dừng giữa chừng)

Điền theo mẫu `../ai-workflow/templates/session-handoff.md`.
