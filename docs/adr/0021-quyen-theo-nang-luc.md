# ADR 0021 — Quyền là ma trận role → năng lực, không phải danh sách role tại từng route

Status: Accepted

## Context

Slice-1 (quản lý người dùng, cơ sở, phân quyền) đã Done từ PR #3. Nhưng marker `TODO(slice-1)` trong `apps/api/src/platform/db.ts` vẫn treo, và khi rà lại thì phần phân quyền còn ba lỗ hổng thật — không phải "chưa làm RBAC" mà là **RBAC đã có nhưng được cài bằng cách lặp lại**:

1. **`role` không có kiểu.** DB có `users_role_check` (migration `20261117000000`) nhưng Kysely khai báo `ColumnType<string, …>` và `UserRecord.role: string`, nên `toPublicUser` phải viết `role: user.role as PublicUser['role']`. Hệ quả: thêm một role vào DB mà quên `UserRole` trong `@lms/shared` thì **API vẫn compile**, trả ra role lạ, và FE rơi vào nhánh không có.
2. **Quyền là danh sách role hardcode tại ~30 chỗ khai báo guard** (11 tổ hợp role khác nhau), cộng thêm một bản sao ở `apps/web/src/components/layout/nav.ts`. Không có chỗ nào trả lời được "ai được export danh sách học viên?" ngoài `grep`.
3. **Luật "superadmin vượt mọi guard" được cài lại 6 nơi**: `rbac.ts`, `exams/routes.ts` (3 chỗ), `questions/routes.ts`, `RequireAuth.tsx`. Thêm một chỗ kiểm tra mới mà quên luật thì chỉ tài khoản superadmin gặp 403 — và không test nào bắt được vì test thường đăng nhập bằng admin/teacher.

Ngoài ra `users/routes.ts` tự viết một `makeRequireAdmin` riêng (resolve phiên + so role bằng tay) thay vì dùng guard chung — bản sao thứ bảy của cùng một logic.

Ba lỗ hổng này không gây lỗi đang cháy. Giá trị của việc sửa là **bảo trì và chặn lớp lỗi tiềm ẩn**, nên phạm vi được chọn là hướng tối thiểu: **không đổi schema, không đổi hành vi phân quyền**.

## Decision

1. **Gõ kiểu `role` bằng `UserRole`** ở cả `UsersTable` (Kysely) và `UserRecord` (auth service). Bỏ hẳn cast trong `toPublicUser`. Lệch giữa DB và contract trở thành **lỗi compile**.
2. **`packages/shared/src/permissions.ts` là nơi duy nhất định nghĩa ai được làm gì**: `PERMISSIONS` (mã quyền theo `<miền>.<hành động>`), `ROLE_PERMISSIONS` (ma trận), `can(role, permission)`.
3. **`superadmin` lấy nguyên mảng `PERMISSIONS`** thay vì liệt kê tay, nên thêm quyền mới thì superadmin có ngay, không thể quên. Không có nhánh `if (role === 'superadmin')` ẩn trong `can`.
4. **`rbac.requirePermission(...)` thay cho `requireRole(...)` tại mọi route có phân quyền.** `requireRole` chỉ còn cho các route **chỉ yêu cầu đăng nhập** (`requireRole()` với danh sách rỗng). Nhiều quyền truyền vào thì **tất cả** đều phải có (AND).
5. **`isAllowed(role, roles)` giữ luật superadmin ở đúng một chỗ**, dùng chung cho `requireRole` (BE) và `RequireAuth` (FE). Danh sách rỗng = chỉ cần đăng nhập.
6. **`branchScopeOf(user, scope)` giữ luật superadmin vượt branch-scope ở đúng một chỗ**, trả `undefined` nghĩa là "không giới hạn". Thay cho biểu thức `user.role === 'superadmin' ? undefined : await …` lặp lại trong handler.
7. **`users/routes.ts` dùng guard chung** (`rbac.requirePermission('user.manage')`), bỏ `makeRequireAdmin` tự viết. `UsersRoutesDeps` nhận `rbac` thay cho `authStore`.

Điều **không** làm trong ADR này: bảng `permissions`/`role_permissions`/`user_permissions`. Chỉ đáng làm khi trung tâm thật sự cần cấp quyền **lẻ từng người** (ví dụ một staff phụ trách báo cáo); nếu không, đó là bảng dữ liệu không ai bảo trì.

## Consequences

- **Hành vi phân quyền không đổi**: mỗi mã quyền giữ đúng tập role như guard cũ, và 325 test API (gồm test route theo từng feature với các role khác nhau) chứng minh điều đó.
- Thêm một role mới giờ là **một mục trong `ROLE_PERMISSIONS`**, không phải rà 30 chỗ. Câu hỏi "ai được export danh sách học viên?" trả lời được bằng cách đọc một dòng.
- Lệch giữa DB và contract thành lỗi compile. Khi thêm role vào DB phải sửa `UserRole` — đúng ý đồ.
- `permissions.test.ts` khoá các tính chất dễ suy luận sai: không có quyền trùng, không có quyền "chết" (không role nào có), không có mã quyền gõ sai, superadmin có đủ.
- **Còn lệch có chủ ý**: `apps/web/src/components/layout/nav.ts` vẫn khai báo `roles` riêng cho từng mục menu. Đó là quyết định hiển thị (ẩn/hiện menu), không phải kiểm soát truy cập — API mới là nơi thực thi. Gộp luôn vào ma trận quyền sẽ cần thêm bộ mã `nav.*` và một đợt đổi rộng ở FE; để slice riêng nếu thấy cần.
- `attendance.manage` và các quyền admin-only vẫn tách theo miền (`center.manage`, `setting.manage`, …) chứ không gộp thành một `admin.*`: gộp lại thì thêm một role quản trị bộ phận sẽ không cấp được quyền hẹp.
- Nếu sau này cần audit "ai đã được cấp quyền gì, khi nào" thì phải chuyển sang mô hình bảng — ADR này không giải quyết việc đó.
