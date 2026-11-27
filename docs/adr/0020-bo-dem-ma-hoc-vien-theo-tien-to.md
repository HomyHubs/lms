# ADR 0020 — Bộ đếm mã học viên thuộc về tiền tố, không suy ra từ dữ liệu (trả nợ slice-23-b)

Status: Accepted

## Context

ADR 0014 quyết định mã học viên = `branches.code` + số thứ tự zero-pad (`HN0001`). Cách hiện thực ban đầu (`apps/api/src/features/users/store.ts`) suy ra số kế tiếp bằng cách quét dữ liệu:

```ts
where student_code like `${prefix}%`   // rồi lấy max(phần số sau prefix) + 1
```

Cách này sai khi tiền tố không có dấu phân cách, vì hai cơ sở có `code` lồng nhau sẽ khớp cùng một mẫu:

- Cơ sở A có `code = 'HV'`, đã cấp `HV0001`, `HV0002`.
- Cơ sở B có `code = 'HV1'`, cấp `HV10001`.
- Bộ đếm của A quét `like 'HV%'` → khớp cả `HV10001`, lấy max = 10001 → cấp `HV10002`.

Học viên thứ ba của A nhận số 10002 dù cơ sở chỉ có hai người. Unique index `users_student_code_unique` chặn được mã trùng nên **không có dữ liệu sai**, nhưng số thứ tự mất ý nghĩa và mọi đoạn parse mã đều ra số vô lý.

Gốc rễ không phải "thiếu dấu phân cách" mà là **bộ đếm không có nơi trú ngụ**: nó được suy lại từ dữ liệu mỗi lần cấp mã, nên phạm vi của nó do một biểu thức `like` quyết định, không do nghiệp vụ.

## Decision

1. **Thêm bảng `student_code_seq(prefix text primary key, next_value integer, updated_at)`.** Bộ đếm có chỗ trú ngụ thật, không suy lại từ `users` mỗi lần cấp.
2. **Khoá là `prefix`, không phải `branch_id`.** Tiền tố chính là thứ quyết định chuỗi mã. Hệ quả có chủ ý: hai cơ sở tình cờ dùng chung `branches.code` **buộc phải** dùng chung bộ đếm — nếu tách theo `branch_id`, chúng sẽ cấp trùng số và vòng retry thành vô ích.
3. **Cấp số bằng một câu lệnh nguyên tử**: `insert … values (prefix, 2) on conflict (prefix) do update set next_value = next_value + 1 returning next_value`. Không `select` trước, nên hai request đồng thời không thể đọc cùng một giá trị. `next_value` là số **sẽ** cấp; lần đầu trả 2 → cấp 1.
4. **Không đổi định dạng mã đã cấp.** Phương án `HV-0001` bị loại vì mã đã in trên phiếu/thẻ và đang nằm trong file Excel của trung tâm; sau ADR 0019 (bỏ fallback SĐT) file cũ dùng mã cũ sẽ thành `student_not_found`. Đổi thứ người ta đã in ra giấy để sửa một lỗi thẩm mỹ là đánh đổi sai chiều.
5. **Seed trong migration, quy mã cũ về đúng cơ sở của học viên** (cơ sở gán sớm nhất, giống `branchCodeForUser`), rồi lấy max số thuần trong phạm vi cơ sở đó. Seed **được phép đếm dư** (học viên chuyển cơ sở khiến mã lạ lọt vào) — đếm dư chỉ làm số bắt đầu cao hơn, không bao giờ gây trùng; đếm thiếu mới nguy hiểm.
6. **Giữ nguyên `assignCodeWithRetry`.** Sau thay đổi này retry gần như không còn cần (bộ đếm đã nguyên tử), nhưng vẫn là lưới an toàn cho trường hợp hai tiền tố khác nhau tình cờ sinh ra cùng chuỗi (vd `HV` đạt 10001 và `HV1` đạt 1 đều cho `HV10001`).

## Consequences

- Số thứ tự của mỗi cơ sở độc lập, kể cả khi `code` lồng nhau. Cơ sở A tiếp tục từ 3, cơ sở B từ 2.
- Mã đã cấp sai trước đây (`HV10002`) **giữ nguyên** — xấu nhưng vô hại, và sửa chúng là migrate mã đã in, đúng thứ ADR này từ chối làm.
- Xoá học viên không trả lại số; lỗ hổng số là bình thường với dãy định danh.
- Nếu `branches.code` bị đổi sau khi đã cấp mã: bộ đếm đi theo **tiền tố mới** (bắt đầu lại), còn mã cũ giữ tiền tố cũ. Không sinh trùng nhờ unique index + retry, nhưng một cơ sở có thể có hai dãy số. Muốn tránh thì cấm đổi `branches.code` khi cơ sở đã có học viên — việc của một slice khác nếu cần.
- Thêm một bảng phải bảo trì: nếu bảng bị xoá tay, lần cấp mã kế tiếp bắt đầu từ 1 và sẽ đụng unique index → retry đẩy lên. Tự chữa, nhưng chậm.
- Hai cơ sở dùng chung `branches.code` vẫn là cấu hình sai về mặt nghiệp vụ (mã không phân biệt được cơ sở). ADR này không thêm ràng buộc unique cho `branches.code` vì dữ liệu thật có thể đang trùng; nếu muốn chặn thì cần khảo sát dữ liệu trước.
