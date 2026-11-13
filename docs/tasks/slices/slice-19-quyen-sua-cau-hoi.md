# Slice 19 — Phân quyền sửa câu hỏi theo role

- Cơ chế: Dọc
- Owner hiện tại: —
- Nhánh: —
- PR: —
- Trạng thái: xem `../MVP-BACKLOG.md` (nguồn trạng thái duy nhất)
- Phụ thuộc: slice-1 (Done), slice-3 (Done)
- Sửa mục gốc: —

Theo ADR 0015 (`docs/adr/0015-question-edit-permission.md`).

## Mục tiêu bấm được / nghiệm thu được

- Admin/Superadmin bật/tắt quyền sửa câu hỏi cho từng role ngay trong màn quản lý người dùng (`apps/web/src/features/users/UsersPage.tsx`).
- Mặc định Staff/Admin/Superadmin được sửa; Teacher/Student không được (khớp ADR 0015).
- Server enforce: mọi route ghi câu hỏi (POST/PATCH/DELETE `/questions`, POST `/questions/import`) trả 403 khi role phiên bị tắt quyền — không phụ thuộc UI ẩn nút.
- Bảng settings trống/chưa seed → dùng mặc định (fail-safe về phía hạn chế).

## Task

| # | Task | Tầng | Ghi chú |
| --- | --- | --- | --- |
| 1 | Migration thêm bảng settings quyền sửa câu hỏi toàn hệ thống: `db/migrations/20261119000000_question_edit_permissions.sql` (tên tăng sau `20261118000000_exam_classes.sql`), ví dụ `question_edit_permissions(role text primary key, can_edit boolean not null)`. Chỉ thêm, có `down` drop bảng (đảo ngược được). Không bắt buộc seed — thiếu dòng = dùng mặc định. | DB | ADR 0015: migration chỉ thêm, đảo ngược được |
| 2 | Contract dùng chung: `packages/shared/src/question-permissions.ts` — kiểu `QuestionEditPermissions` (map role→boolean) + schema Zod + hằng `DEFAULT_QUESTION_EDIT_PERMISSIONS` (Staff/Admin/Superadmin = true; Teacher/Student = false); export qua `packages/shared/src/index.ts`. | Shared | Dùng chung FE + API |
| 3 | Store + service đọc/ghi settings: feature mới `apps/api/src/features/settings/` (store Kysely đọc bảng Task 1, trộn mặc định cho role thiếu). Hàm `getQuestionEditPermissions()` / `setQuestionEditPermissions()`. | API | Trộn mặc định ở service, không dựa vào seed |
| 4 | Endpoint: `GET /settings/question-edit-permissions` và `PUT /settings/question-edit-permissions`, guard chỉ Admin/Superadmin (mẫu `makeRequireAdmin` trong `apps/api/src/features/users/routes.ts`); validate body bằng schema Task 2. | API | 403 cho role khác |
| 5 | Guard enforce ở questions routes: trong `apps/api/src/features/questions/routes.ts`, các route GHI đổi từ `rbac.requireRole('admin','teacher')` sang guard mới đọc settings rồi quyết theo `getSessionUser(request).role`; 403 khi role bị tắt; Superadmin luôn qua. `GET /questions` (đọc) giữ cho Admin/Teacher. | API | BẮT BUỘC enforce server (ADR 0015); xem Integration notes vì đổi hành vi Teacher/Staff hiện tại |
| 6 | UI settings trong quản lý user: `UsersPage.tsx` thêm khối "Quyền sửa câu hỏi theo vai trò" (toggle mỗi role), chỉ Admin/Superadmin thấy và ghi được; hook `useQuestionEditPermissions` gọi endpoint Task 4 qua `apps/web/src/lib/api.ts`. | FE | Yêu cầu 3.5 |
| 7 | Ẩn/hiện nút Sửa/Xoá/Import theo quyền trong `QuestionsPage.tsx` (phụ trợ UX): đọc quyền của role phiên để ẩn nút khi không được phép, nhưng vẫn dựa 403 của server làm nguồn đúng. | FE | Không thay guard server |
| 8 | Test: API — migration up/down; `GET/PUT settings` RBAC + validate; guard questions (Teacher 403 khi tắt, qua khi bật; Staff qua theo mặc định; Superadmin luôn qua; settings trống → mặc định). FE — `UsersPage.test.tsx` toggle; `QuestionsPage` ẩn nút theo quyền. | FE/API | Có test enforce server, không chỉ test ẩn nút |

## Stub cho phép

- Chưa cấu hình quyền theo từng cơ sở (branch-scoped) — ADR 0015 chốt settings toàn hệ thống; mở rộng theo cơ sở để dành slice sau kèm ADR mới.

## Không được stub

Xác thực, phân quyền, hạn mức, chuỗi hiển thị — trừ khi ghi khác trong ADR. Guard quyền sửa câu hỏi PHẢI enforce ở server (route questions), ẩn nút UI không thay thế guard; settings trống phải dùng mặc định hạn chế.

## Nợ kỹ thuật

| Marker | Vị trí | Nội dung | Dự kiến trả |
| --- | --- | --- | --- |
| NOTE | feature `apps/api/src/features/settings` | Settings toàn hệ thống, chưa scope theo cơ sở | Slice mở rộng + ADR mới khi cần theo cơ sở |
| CARE | `apps/api/src/features/questions/routes.ts` | Đổi guard làm Teacher mất quyền sửa mặc định và Staff được thêm quyền so với slice-3 | Thông báo người dùng hiện có + seed đúng khi triển khai |

## Nhật ký thay đổi phạm vi của riêng Slice/Task này

| Ngày | Loại | Nội dung | Lý do | ADR |
| --- | --- | --- | --- | --- |
| 2026-11-12 | Thêm | Tạo slice | Yêu cầu 3.5: bật/tắt quyền sửa câu hỏi theo role trong quản lý user | 0015 |

## Cách nghiệm thu

1. Đăng nhập Admin → màn quản lý người dùng thấy khối "Quyền sửa câu hỏi theo vai trò"; Teacher đang tắt.
2. Đăng nhập Teacher → gọi PATCH/POST/DELETE `/questions` (hoặc thao tác sửa trên UI) bị 403; nút sửa/xoá bị ẩn.
3. Admin bật quyền cho Teacher → Teacher sửa được; tắt lại → 403 trở lại.
4. Staff (settings trống cho Staff) sửa được theo mặc định; Student luôn 403.
5. Superadmin luôn sửa được bất kể settings.
6. Chạy migration down rồi up lại OK; `pnpm -r build && lint && typecheck && test` + integration PG18 PASS, gồm test guard questions + settings.

## Bàn giao phiên gần nhất
