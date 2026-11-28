# ADR 0023 — Mã cơ sở là duy nhất

Status: Accepted (2026-11-28)

## Context

Từ ADR 0014/0020/0022, tiền tố mã học viên lấy từ `branches.code` (fallback `HV`), và bộ đếm `student_code_seq` khoá theo **tiền tố**:

- `branches.code = 'HN'` → học viên `HN-0001`, `HN-0002`, …
- Hai cơ sở cùng `code = 'HN'` → **dùng chung một bộ đếm và sinh ra một dãy mã** (đúng theo thiết kế của ADR 0020: cùng chuỗi tiền tố thì phải cùng bộ đếm, nếu không sẽ trùng mã).

Nhưng ADR 0022 đặt ra một tính chất mới cho mã: **đọc mã là biết học viên thuộc cơ sở nào**. Tính chất đó chỉ đúng nếu `branches.code` là duy nhất. Hiện tại:

- Không có unique index trên `branches.code`.
- `branches.code` **không nằm trong contract** `Branch` và **không có trong `CreateBranchRequest`/`UpdateBranchRequest`** — API không đọc, không ghi cột này. Nó chỉ được ghi bởi seed hoặc SQL tay.
- `normalizeStudentCodePrefix` **trim** trước khi dùng làm khoá bộ đếm, nên `'HV'` và `'HV '` là **cùng một tiền tố** dù là hai chuỗi khác nhau trong DB.

Hệ quả: hai cơ sở trùng mã không gây lỗi dữ liệu (mã vẫn unique nhờ `users_student_code_unique`), nhưng mã học viên mất khả năng phân biệt cơ sở — đúng thứ ADR 0022 vừa sửa xong. Lỗi này im lặng: không test nào đỏ, không màn hình nào sai.

## Decision

1. **Thêm unique index một phần trên `upper(btrim(code))`**, chỉ áp dụng cho dòng có mã khác rỗng:

   ```sql
   create unique index if not exists branches_code_unique
     on branches (upper(btrim(code)))
     where code is not null and btrim(code) <> '';
   ```

2. **Chuẩn hoá cả trim lẫn hoa/thường trong khoá duy nhất**, vì `normalizeStudentCodePrefix` đã trim (nên `'HV'` và `'HV '` chắc chắn đụng bộ đếm), và hai tiền tố chỉ khác hoa/thường (`'hv'` vs `'HV'`) cho ra hai dãy mã nhìn gần như giống nhau — người dùng không phân biệt được, trong khi hệ thống coi là khác.
3. **Migration kiểm tra trùng TRƯỚC khi tạo index và báo lỗi có thể đọc được**, liệt kê các mã đang trùng, thay vì để Postgres trả `23505` trần. `dbmate up` trên một DB đang có dữ liệu trùng sẽ **dừng** — đó là hành vi mong muốn: tự động đổi tên cơ sở sẽ làm mã học viên đã cấp trỏ sai cơ sở, tệ hơn nhiều so với việc bắt người vận hành quyết định.
4. **Không mở `code` ra API/UI trong ADR này.** Cho sửa `branches.code` là một tính năng khác: phải chặn đổi khi cơ sở đã có học viên, hoặc chấp nhận rằng mã cũ giữ tiền tố cũ (tiền tố là lịch sử, không phải thuộc tính hiện tại — xem ADR 0022 §Decision 4). Trộn hai quyết định đó vào một thay đổi là tự tạo lỗ hổng.
5. **Index là ràng buộc ở tầng dữ liệu, không phải ở tầng API.** Vì API không ghi `code`, index bảo vệ seed và thao tác SQL tay — đúng những đường đang thực sự tạo ra giá trị này.

## Consequences

- Hai cơ sở trùng mã (kể cả chỉ khác hoa/thường hoặc khoảng trắng thừa) không còn tạo được. Mã học viên giữ được tính chất "đọc mã biết cơ sở".
- Trên một DB đã có dữ liệu trùng, migration **fail có chủ ý** kèm danh sách mã trùng. Người vận hành phải đổi `code` của một trong hai cơ sở bằng SQL trước khi chạy lại. Không có đường tự động.
- **Seed demo không set `branches.code`**, nên toàn bộ học viên demo mang tiền tố `HV`. Đây là hiện trạng, không phải hệ quả của ADR này — nhưng nó có nghĩa là index chưa thay đổi gì trên dữ liệu demo.
- Index là **biểu thức**, không phải unique constraint trên cột: `insert ... on conflict (code)` không dùng được index này. Không nơi nào cần — bảng `branches` không có luồng upsert.
- Đảo ngược bằng `drop index if exists branches_code_unique`; không mất dữ liệu.
- Nếu sau này cho sửa `code`, phải quyết định rõ: mã học viên đã cấp **giữ tiền tố cũ** (khuyến nghị, theo ADR 0022) hay được đổi theo. ADR này không trả lời câu đó.
