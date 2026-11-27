# AGENTS.md — Users API

Nhật ký này thuộc riêng feature/nhánh này. Cập nhật liên tục, tối thiểu mỗi ngày làm việc, ngay cả khi task chưa xong.

## Bối cảnh feature

- Nhiệm vụ: CRUD người dùng (Admin/superadmin) + mã học viên (slice-23); map DB row -> AdminUser an toàn (không lộ password_hash).
- Slice/Task đã triển khai: slice-23 (`docs/tasks/slices/slice-23-ma-hoc-vien.md`), slice-26 (`docs/tasks/slices/slice-26-nguoi-dung-hien-thi.md`).
- Phụ thuộc: `@lms/shared` (`AdminUser`, `CreateUserRequest`…); `auth/index.js` (resolve phiên, bam mat khau); `platform/db` (Kysely).
- Owner hiện tại: Hoang Hoang HA

## Contract (cửa công khai — chốt trước, không đổi giữa chừng)

- `usersRoutes(app, { authStore, usersStore })`: `GET/POST /users`, `GET/PATCH/DELETE /users/:id` (chỉ Admin; role cao chỉ superadmin quản lý).
- `UsersStore` (service.ts): `listUsers/findUserById/findUserByPhone/createUser/updateUser/deleteUser` + slice-23 `findUserByStudentCode/assignStudentCode/branchCodeForUser`.
- `AdminUser.studentCode` (shared) chảy qua `toAdminUser` (map `row.student_code`).
- `AdminUser.age`: dẫn xuất ở backend, KHÔNG lưu DB. Từ ADR 0018: tính từ `birthDate` (chính xác), fallback `birthYear` (ước lượng ±1). Chỉ role `student` mới có tuổi.
- `AdminUser.birthDate` (`YYYY-MM-DD`) + `AdminUser.birthYear`: hai mức chính xác của CÙNG một dữ liệu. Có `birthDate` thì `birthYear` dẫn xuất từ nó.

## Nhật ký liên tục (thêm mục mới mỗi ngày, không ghi đè mục cũ)

### 2026-11-14 — slice-23 Mã học viên

**Đã xong**
- Sinh mã tự động khi tạo học viên (`createUser`): chỉ role `student`, tiền tố theo cơ sở (`branches.code`, fallback `HV`) + số thứ tự zero-pad 4 (vd `HN0001`/`HV0001`); role khác giữ `student_code = null`. `store.ts` thêm `student_code` vào `SAFE_COLUMNS`, `findUserByStudentCode`, `nextStudentCode`, `setStudentCode`, `branchCodeForUser`.
- `toAdminUser` map `studentCode` (read-only). Migration `20261120000001_users_student_code.sql` + rollback gate `scripts/student-code.integration.mjs` (up/down/up trên PG18 container).

**Đang làm dở**
- Hiển thị mã ở FE là read-only; chưa có UI sửa/nhập tay mã học viên (để slice sau).

**Bước tiếp theo**
- Grade-import (feature `exams`) khớp theo `student_code` là khoá DUY NHẤT — fallback SĐT đã bị gỡ (ADR 0019, 2026-11-27); xem `exams/AGENTS.md` mục slice-23.
- Nợ: sinh số thứ tự khi tạo đồng thời cùng prefix có thể trùng (`TODO(slice-23)` trong `store.ts`) — cần advisory lock/retry khi phát sinh trùng thực tế. **ĐÃ TRẢ 2026-11-27**: gộp thành `assignStudentCode` dùng `assignCodeWithRetry` (sinh lại mã + thử lại tối đa 5 lần khi unique violation); marker đã bỏ, có `users/store.test.ts` 4 case. `TODO(slice-23-b)` (bộ đếm dùng chung khi tiền tố lồng nhau) cũng **đã trả** — xem mục 2026-11-27 ở trên (ADR 0020).

### 2026-11-27 — slice-23-b: bộ đếm mã khoá theo tiền tố (ADR 0020)

**Đã xong**
- `store.ts`: `nextCode` thôi quét `student_code like '<prefix>%'` (cách này khiến cơ sở `HV` và `HV1` dùng chung bộ đếm — mã `HV10001` của `HV1` khớp `like 'HV%'`). Nay cấp số bằng upsert nguyên tử trên bảng `student_code_seq`:
  `insert … values (prefix, 2) on conflict (prefix) do update set next_value = next_value + 1 returning next_value`, rồi `padStart(4)`.
- Migration `20261127000001_student_code_seq.sql`: tạo bảng + seed từ dữ liệu đã cấp. Seed quy mã về **đúng cơ sở của học viên** (cơ sở gán sớm nhất, giống `branchCodeForUser`) chứ không dùng `like`, và **được phép đếm dư** — dư chỉ làm số bắt đầu cao hơn, thiếu mới gây trùng.
- `db.ts`: thêm `StudentCodeSeqTable` (khoá `prefix`, không phải `branch_id`).
- **Không đổi định dạng mã đã cấp.** Phương án `HV-0001` bị loại vì mã đã in trên phiếu/thẻ và đang nằm trong file Excel của trung tâm; sau ADR 0019 file cũ dùng mã cũ sẽ thành `student_not_found`.

**Vì sao khoá là tiền tố, không phải branch_id**
- Tiền tố chính là thứ quyết định chuỗi mã. Hai cơ sở tình cờ dùng chung `branches.code` **buộc phải** chung bộ đếm; tách theo `branch_id` thì chúng cấp trùng số và vòng retry thành vô ích.

**Bước tiếp theo**
- Nếu đổi `branches.code` sau khi đã cấp mã, bộ đếm đi theo tiền tố mới (bắt đầu lại) còn mã cũ giữ tiền tố cũ → một cơ sở có thể có hai dãy số. Muốn chặn thì cấm đổi `branches.code` khi cơ sở đã có học viên (slice khác).
- Chưa có unique constraint trên `branches.code`; dữ liệu thật có thể đang trùng nên phải khảo sát trước khi thêm.

### 2026-11-14 — slice-26 Hiển thị người dùng

**Đã xong**
- slice-26: `toAdminUser()` chỉ tính `age` cho role học viên (`row.role === 'student' && birthYear != null`); role khác luôn `age = null` dù có `birth_year`.
- Thêm `TODO(slice-26)`: tuổi tính từ `birth_year` sai lệch ±1; cần cột `birth_date` (migration + slice sau) nếu muốn chính xác.
- Test `service.test.ts`: thêm case học viên có tuổi, giáo viên có birthYear nhưng age = null.

**Bước tiếp theo**
- Chỉ đụng cách tính/hiển thị; không đổi dữ liệu DB.

### 2026-11-27 — Trả nợ `TODO(slice-26)`: tuổi chính xác theo `birth_date` (ADR 0018)

**Đã xong**
- Migration `20261127000000_users_birth_date.sql`: thêm `users.birth_date date` (nullable, additive, **không backfill** — không suy ra được ngày/tháng từ năm sinh).
- `apps/api/src/features/users/age.ts` (mới): `todayInVN`, `parseIsoDate`, `ageFromBirthDate`, `ageFromBirthYear`, `displayAge`. Hàm thuần, nhận `today` dạng `YYYY-MM-DD` để test tất định; mọi so sánh theo `Asia/Ho_Chi_Minh`.
- `service.ts`: `toAdminUser(row, today)` dùng `displayAge`; `birthYearOf` dẫn xuất `birth_year` từ `birth_date`; `createUser`/`updateUser` nhận `birthDate` và tự dẫn xuất `birthYear`. `listUsers/getUser/createUser/updateUser` nhận `today` (mặc định `todayInVN()`) để test bơm ngày cố định.
- `store.ts`: `SAFE_COLUMNS` đọc `birth_date` qua `to_char(..., 'YYYY-MM-DD')` (theo mẫu `attendance/store.ts`) để `pg` không trả `Date` lệch ngày. Đường GHI dùng `.returning('id')` rồi `readRow(id)` — không nhét biểu thức vào `RETURNING`.
- Xoá `TODO(slice-26)`. Nợ còn lại đổi tên thành `TODO(slice-26-b)`: dữ liệu cũ chỉ có năm sinh vẫn lệch ±1, không sửa được bằng code.

**Đã kiểm**
- `age.test.ts` (15 case): 3 ngày quanh sinh nhật, 29/02 năm không nhuận, ngày không tồn tại, ngày tương lai, chỉ-có-năm.
- `service.test.ts`: tuổi chính xác trước/sau sinh nhật, `birthDate` thắng `birthYear` lệch, xoá `birthDate` giữ `birthYear`.
- `store.integration.test.ts` (mới, cần `TEST_DATABASE_URL`): round-trip `birth_date` ra đúng chuỗi `YYYY-MM-DD`; `assignStudentCode` tuần tự theo `branches.code` trên Postgres thật (trước đây chỉ có hàm thuần được test).
- `packages/shared/src/users.test.ts` (mới, 14 case): ngày không có thật, ngày tương lai, cặp `birthDate`/`birthYear` lệch năm, payload cũ không có `birthDate` vẫn parse.

**Bước tiếp theo**
- Dữ liệu cũ chỉ có năm sinh: cần nhập bổ sung ngày sinh thật (việc dữ liệu, không phải code).
- FE hiển thị `~<tuổi>` + tooltip khi chỉ biết năm sinh (`UsersPage.formatAge`).

## Bàn giao phiên (điền khi dừng giữa chừng, dùng mẫu docs/ai-workflow/templates/session-handoff.md)
- —
