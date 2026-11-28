# ADR 0024 — Menu và cổng route của FE tính từ ma trận quyền

Status: Accepted (2026-11-28)

## Context

ADR 0021 gom quyền của API về một ma trận `ROLE_PERMISSIONS` trong `@lms/shared`. Nhưng FE vẫn giữ **danh sách role riêng** trong `apps/web/src/components/layout/nav.ts`:

```ts
{ path: '/users', label: 'Người dùng', roles: ['admin'] }
```

Danh sách này không chỉ để vẽ menu: `App.tsx` dùng chính nó làm cổng route (`RequireAuth role={[...item.roles]}`). Nên FE có một bản sao thứ hai của "ai được làm gì", độc lập với API. Hai bản sao này lệch nhau theo hai chiều, và cả hai đều im lặng:

- Menu hiện một trang mà API sẽ trả 403 → người dùng bấm vào rồi bị đá ra.
- Menu giấu một trang mà người dùng có quyền → không ai báo lỗi, tính năng coi như không tồn tại.

Điều **không** đúng là giả định "tập role của menu = tập role của quyền". Chúng khác nhau có chủ ý ở ba chỗ:

| Màn | Role thấy menu | Quyền tương ứng | Vì sao khác |
| --- | --- | --- | --- |
| `/grading` | admin, teacher | `grading.grade` = admin, teacher, **staff** | Staff chấm bài qua luồng khác (đưa điểm vào lớp), không đi qua màn Chấm bài. |
| `/attendance` | admin, teacher, student | `attendance.read` = admin, teacher; `attendance.self` = student | Menu là **hợp** của hai năng lực khác nhau. |
| `/exam-management` | admin, teacher, student | `exam.manage` = admin, teacher; `exam.take` = student | Trang hub, mỗi role thấy tile khác nhau. |

Vì vậy không thể chỉ "dùng lại quyền" cho mọi mục menu. Cần một cách nói rõ: menu này mở cho **năng lực nào**, và khi ý định menu hẹp hơn năng lực API thì ý định đó phải được đặt tên, không được để nằm trong một mảng role không ai giải thích.

## Decision

1. **`NavItem` khai báo `permissions: readonly Permission[]` thay cho `roles`.** Ngữ nghĩa **any-of**: có ít nhất một quyền là thấy. Mảng rỗng = mọi người đã đăng nhập (khớp với `isAllowed(role, [])` của ADR 0021).
2. **`RequireAuth` nhận `permission` (một hoặc nhiều) và dùng `canAny` của `@lms/shared`**, bỏ hẳn prop `role`. Cổng route và menu đọc **cùng một khai báo** — không còn hai nguồn để lệch.
3. **Thêm hai quyền chỉ để diễn đạt ý định menu**, giữ nguyên tập role như trước:
   - `grading.menu` = {admin, teacher} — được thấy màn Chấm bài (hẹp hơn `grading.grade`).
   - `enrollment.manage` = {admin} — được quản lý ghi danh (`/assignments`; trước đây mượn không quyền nào cả).
4. **Quyền `.menu` chỉ dùng cho điều hướng, KHÔNG bao giờ dùng làm guard API.** Chúng không tương ứng với một endpoint; dùng chúng ở API sẽ tạo một lớp quyền thứ hai không ai kiểm soát. Ghi rõ trong `permissions.ts` cạnh khai báo.
5. **Giữ nguyên hành vi của superadmin**: superadmin thấy menu của admin (không thấy mục riêng của học viên như "Bài thi của tôi"), đúng như trước. Cổng route vẫn cho superadmin đi qua mọi nơi nhờ luật "superadmin vuốt mọi guard" trong `isAllowed`/`can`. Đây là hai câu hỏi khác nhau — "thấy menu gì" và "được vào không" — và ADR này không gộp chúng.

## Consequences

- Thêm một trang mới bắt buộc phải chọn một quyền trong ma trận. Đây là ma sát có chủ ý: nó buộc trả lời "ai được vào", thay vì chép một mảng role.
- FE không còn mảng role nào. `grep "'admin'"` trong `apps/web/src` chỉ còn ở test fixture.
- Hai quyền `.menu` là loại quyền thứ hai trong cùng một mảng — rủi ro thật: người sau có thể dùng `grading.menu` làm guard API. Giảm thiểu bằng tên gọi, ghi chú tại khai báo, và việc chúng không xuất hiện ở bất kỳ `requirePermission` nào.
- `navItemsFor`/`examItemsFor` giữ nguyên chữ ký `(role)`, nên `AppShell`, `HomePage`, `ExamManagementPage` không phải sửa.
- Test `apps/web/src/components/layout/nav.test.ts` khoá lại tập path nhìn thấy của **từng role**. Đó là bằng chứng "không đổi hành vi"; nếu ai sửa ma trận làm menu đổi, test đỏ và buộc phải sửa test một cách có ý thức.
- Khi quyền chuyển sang bảng DB (chưa làm), menu tự đúng theo vì FE chỉ hỏi `canAny`.
