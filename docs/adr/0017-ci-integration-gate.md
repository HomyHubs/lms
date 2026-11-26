# 0017 — Cổng gác CI phải chạy integration test trên mọi push vào `dev`

- Ngày: 2026-11-26
- Trạng thái: Đã áp dụng
- Liên quan: `.github/workflows/dev-health-check.yml`, `db/migrations/`, `apps/api/src/features/examhistory/store.ts`

## Bối cảnh

Khi thêm Postgres vào `dev-health-check.yml` (việc đang làm), CI lộ ra một chuỗi lỗi
đã tồn tại từ lâu mà không ai thấy, vì **cổng gác tích hợp chưa từng thực sự chạy**:

| Workflow | Trigger | Có Postgres? | Kết quả thực tế |
| --- | --- | --- | --- |
| `ci.yml` | `pull_request` → dev/main | Có | **Đỏ từ 2026-11-21** (mọi run đều `failure`) |
| `dev-health-check.yml` | `push` → dev | **Không** | Xanh, nhưng 22 test `*.integration.test.ts` bị **skip** |

Vì công việc gần đây push thẳng vào `dev` (không mở PR), không run nào chạy test tích hợp.
Kể cả khi có PR, `ci.yml` cũng đỏ nên tín hiệu đó bị bỏ qua và PR vẫn được merge.

Nguyên nhân `ci.yml` đỏ: `dbmate up` chết với
`duplicate key value violates unique constraint "schema_migrations_pkey"`.

## Nguyên nhân gốc

Hai cặp migration trùng timestamp version:

```
20261115000000_attendance_teacher.sql     ← áp dụng được
20261115000000_users_profile_fields.sql   ← bị chặn (trùng version)
20261120000000_enrollment_history.sql     ← áp dụng được
20261120000000_users_student_code.sql     ← bị chặn (trùng version)
```

dbmate khoá migration theo **version** (phần số trước dấu `_`), không theo tên file.
File thứ hai trong mỗi cặp vì thế **chưa bao giờ được áp dụng** trên bất kỳ DB nào
tạo bằng dbmate. Hệ quả: DB mới (CI, staging, máy dev mới) thiếu
`users.last_name/first_name/birth_year/gender/address/parent_phone`,
`users.student_code` và `branches.code` — tức là thiếu cả cột mà slice-23/slice-30 dùng.

Không ai phát hiện vì script rollback gate `apps/api/scripts/*.integration.mjs` **tự đọc
file `.sql` và áp theo thứ tự sort**, không dùng bảng `schema_migrations`, nên nó vẫn
pass. Chỉ đường dbmate mới lộ.

## Quyết định

1. **Đổi tên file thứ hai của mỗi cặp sang version kế tiếp**, giữ nguyên nội dung:
   `20261115000001_users_profile_fields.sql`, `20261120000001_users_student_code.sql`.
   An toàn vì cả hai file đều idempotent (`add column if not exists`, backfill chỉ điền
   `student_code is null`), nên DB đã có cột chỉ việc re-apply vô hại.
2. **`dev-health-check.yml` có Postgres thật** (`postgres:16-alpine` + `dbmate up` +
   `TEST_DATABASE_URL`), giống `ci.yml`. Từ nay mọi push vào `dev` đều chạy đủ 304 test.
3. **Ghi quy tắc vào `AGENTS.md` mục 16**: version migration phải duy nhất, kèm lệnh
   kiểm tra trước khi commit.

## Hệ quả

- Lần chạy đầu tiên có Postgres (trên nhánh tạm) đã bắt được **một lỗi nghiệp vụ thật**:
  `examhistory/store.ts#selectScopedAttempts` join `enrollments` nhưng thiếu
  `e.ended_at is null`, nên **báo cáo theo cơ sở/lớp vẫn tính lượt thi của học viên đã
  nghỉ** — trái với spec slice-1.1 (*"danh sách lớp, roster và báo cáo theo lớp không
  hiện học viên đã nghỉ; điểm danh và bài thi cá nhân vẫn còn"*). Đã sửa; lịch sử cá
  nhân không đổi vì `listStudentAttempts` không join `enrollments`.
- `dev-health-check` xanh với đủ 304 test (trước đó 282 pass + 22 skip).
- Thời gian job: ~1m07s (thêm Postgres + migrate).
- Bài học: **một cổng gác "xanh" mà bỏ qua test là tệ hơn không có cổng gác**, vì nó tạo
  cảm giác an toàn giả. Khi thêm hạ tầng cho CI, phải kiểm tra số test thực sự chạy,
  không chỉ nhìn màu xanh.
