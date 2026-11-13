# ADR 0015 — Cấu hình quyền sửa câu hỏi theo role (slice-19)

Status: Proposed (mặc định chọn khi người dùng bỏ qua câu hỏi xác nhận).

## Context

Yêu cầu 3.3: Staff/Admin/Superadmin được sửa câu hỏi. Yêu cầu 3.5: "Trong quản lý user có settings cho phép bật tắt quyền sửa câu hỏi của các user role."

Phân quyền câu hỏi hiện cứng trong code (RBAC theo role). Cần một lớp cấu hình cho phép Admin bật/tắt quyền sửa câu hỏi theo từng role, nhưng không được hạ thấp các guard bảo mật đang có.

## Decision

1. Thêm bảng settings quyền sửa câu hỏi ở mức TOÀN HỆ THỐNG (chưa scope theo cơ sở ở MVP). Migration chỉ thêm, đảo ngược được.
2. Mặc định: Staff/Admin/Superadmin = được sửa; Teacher/Student = không (khớp yêu cầu 3.3).
3. Admin/Superadmin chỉnh bật/tắt trong màn quản lý user.
4. BẮT BUỘC enforce ở server (route guard của feature questions), không chỉ ẩn nút ở UI (AGENTS.md mục 20: không stub phân quyền).

## Consequences

- Một nguồn cấu hình duy nhất; nếu sau cần cấu hình theo từng cơ sở thì mở slice mở rộng kèm ADR mới.
- Lớp cấu hình nằm TRÊN nền RBAC hiện có, không thay thế và không nới lỏng các guard khác.
- Nếu bảng settings trống/chưa seed, hệ thống dùng mặc định ở điểm 2 (fail-safe về phía hạn chế).
