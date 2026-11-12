# Task hiện tại (chỉ dùng khi làm tuần tự một mình)

Phạm vi sử dụng: chỉ dùng khi đúng một người/agent làm tuần tự.

## Đang làm

- ID Slice/Task: postman-setup (Bộ tài nguyên Postman cho LMS API)
- Cập nhật ngày: 2026-11-12
- Nhánh: `dev`
- PR: — (commit trực tiếp `aa80a74`, đã push lên `origin/dev`)
- Trạng thái: Done — đã commit & push.

## Đã làm

- Quét toàn bộ backend `apps/api` (16 feature) để liệt kê ~95 endpoint.
- Tạo collection "LMS API" tại `postman/collections/` gồm 16 folder theo feature, URL dùng `{{base_url}}`, path variable, body JSON mẫu; auth theo cookie session (`lms_session`).
- Tạo environment "LMS Local" (`base_url=http://localhost:3000`, `phone_number`, `password` secret, `import_token`).
- Tạo OpenAPI 3.0.3 spec `postman/specs/lms-api.yaml` (hợp lệ, lint 0 lỗi).
- Cập nhật `.gitignore`: theo dõi `postman/` nhưng vẫn bỏ qua `postman/globals/` (chứa secret).
- Commit `aa80a74` (117 file) và push lên `origin/dev`.

## Bước tiếp theo

1. (Tùy chọn) Thêm test script (status code + schema) cho các request trong collection.
2. (Tùy chọn) Chạy thử xác thực: `GET /health` và `POST /auth/login` với tài khoản seed demo.
3. Thông báo team pull `dev` để nhận bộ tài nguyên Postman mới.
