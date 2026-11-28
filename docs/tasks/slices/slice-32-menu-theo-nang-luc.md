# Slice/Task slice-32 — Menu và cổng route của FE tính từ ma trận quyền

- Cơ chế: Dọc
- Owner hiện tại: —
- Nhánh: `dev`
- PR: —
- Trạng thái: xem `../MVP-BACKLOG.md` (nguồn trạng thái duy nhất, không ghi trùng ở đây để tránh lệch)
- Phụ thuộc: slice-1, slice-10
- Sửa mục gốc: slice-1 (ADR 0021 mới gom quyền về một chỗ ở phía API)

## Mục tiêu bấm được / nghiệm thu được

Menu trái, tile ở Tổng quan, và cổng route của FE đều suy ra từ `ROLE_PERMISSIONS` của `@lms/shared`. Không còn mảng role nào trong `apps/web/src`.

Nghiệm thu: với từng role, tập đường dẫn nhìn thấy **giống hệt** trước khi refactor — khoá bằng `nav.test.ts`; và toàn bộ `App.test.tsx` cũ xanh mà không phải sửa kỳ vọng.

## Task

| # | Task | Tầng (nếu dùng Lát cắt ngang) | Ghi chú |
| --- | --- | --- | --- |
| 1 | `packages/shared/src/permissions.ts`: thêm `grading.menu`, `enrollment.manage`; thêm `canAny(role, permissions)` (any-of, mảng rỗng = ai cũng được) | Shared | Ghi rõ `.menu` chỉ dùng cho điều hướng |
| 2 | `nav.ts`: `NavItem.permissions` thay `roles`; `navItemsFor`/`examItemsFor` dùng `canAny`; giữ nguyên việc superadmin thấy menu của admin | Web | Chữ ký hàm không đổi để không phải sửa `AppShell`/`HomePage`/`ExamManagementPage` |
| 3 | `RequireAuth`: prop `permission` thay `role`; `App.tsx` truyền `item.permissions` và quyền cho 2 route ngoài menu (`/attendance/branch/:branchId` → `attendance.manage`, `/students/:id` → `student.read`) | Web | Cổng route và menu đọc cùng một khai báo |
| 4 | Test: `nav.test.ts` khoá tập path theo role; `permissions.test.ts` thêm case `canAny` + 2 quyền mới | Web, Shared | Bằng chứng "không đổi hành vi" |
| 5 | ADR 0024 + nhật ký feature `apps/web/src/components/layout` | Docs | — |

## Stub cho phép

Không có.

## Không được stub

Phân quyền — theo mẫu chung của repo, đây là thứ không được stub.

## Nợ kỹ thuật

| Marker | Vị trí | Nội dung | Dự kiến trả |
| --- | --- | --- | --- |
| — | — | Quyền vẫn là ma trận trong code, chưa có bảng `permissions`/`role_permissions`; đổi quyền phải deploy | Khi cần admin tự bật/tắt quyền |

## Nhật ký thay đổi phạm vi của riêng Slice/Task này

| Ngày | Loại | Nội dung | Lý do | ADR |
| --- | --- | --- | --- | --- |
| 2026-11-28 | Thêm | Tạo slice: FE menu + route guard đọc ma trận quyền | ADR 0021 để lại FE một bản sao danh sách role; lệch nhau thì im lặng (menu 403 hoặc giấu trang) | 0024 |

## Cách nghiệm thu

- Tự động: `pnpm --filter @lms/web test` — `nav.test.ts` (tập path theo role) + `App.test.tsx` (menu và chuyển hướng theo role) + `RequireAuth` qua `App.test.tsx`; `packages/shared` — `permissions.test.ts`.
- Không đổi hành vi: không sửa kỳ vọng nào trong `App.test.tsx`.

## Bàn giao phiên gần nhất

Không có — slice hoàn tất trong một phiên.
