# ADR 0022 — Định dạng mã học viên có dấu phân cách (`HV-0001`)

Status: Accepted (2026-11-27) — thay thế **Decision 4** của ADR 0020

## Context

ADR 0020 sửa **bộ đếm** mã học viên (khoá theo tiền tố, cấp số nguyên tử) nhưng cố ý **không** đổi **chuỗi** mã:

```ts
`${prefix}${String(seq).padStart(4, '0')}`   // 'HV' + '0001' → 'HV0001'
```

Lý do ghi trong ADR 0020 §Decision 4: mã đã in trên phiếu/thẻ và đang nằm trong file Excel của trung tâm, mà sau ADR 0019 (bỏ fallback SĐT) file cũ dùng mã cũ sẽ thành `student_not_found`. Đổi thứ người ta đã in ra giấy để sửa một lỗi thẩm mỹ là đánh đổi sai chiều.

Đó là một **ràng buộc triển khai**, không phải một kết luận thiết kế — và nó không còn đúng: dự án vẫn ở giai đoạn demo, chưa có phiếu/thẻ nào in ra ngoài, chưa có file Excel thật của trung tâm. Chủ dự án chốt đổi định dạng (2026-11-27).

Khi ràng buộc đó biến mất, phần còn lại của ADR 0020 lộ ra một chỗ chưa sửa. ADR 0020 sửa bộ đếm, nhưng **chuỗi mã vẫn mơ hồ**:

- Cơ sở `HV`, số 10001 → `HV10001`
- Cơ sở `HV1`, số 1 → `HV10001`

Hai mã khác nhau về ý nghĩa, giống nhau từng ký tự. Unique index `users_student_code_unique` chặn được mã trùng nên **không có dữ liệu sai**, nhưng:

1. Không ai đọc `HV10001` mà biết được đó là cơ sở nào, số thứ tự bao nhiêu.
2. Mọi đoạn parse mã đều phải **đoán** ranh giới tiền tố/số thứ tự, và đoán sai khi tiền tố lồng nhau.
3. `assignCodeWithRetry` vẫn phải tồn tại chỉ vì hai tiền tố khác nhau có thể sinh ra cùng chuỗi — một lưới an toàn cho một mơ hồ do chính định dạng tạo ra.

Nói cách khác: ADR 0020 chữa **triệu chứng** (bộ đếm nhảy số), định dạng mới chữa **nguyên nhân** (chuỗi không tự phân tách được).

## Decision

1. **Định dạng mã là `<tiền tố>-<số thứ tự>`**, số thứ tự zero-pad tối thiểu 4 chữ số và **dài ra khi cần**: `HV-0001`, `HN-0001`, `HV-10001`. Dấu phân cách là `-`.
2. **Dấu phân cách thuộc về ĐỊNH DẠNG, không thuộc về tiền tố.** `branches.code` vẫn là `HV`; khoá `student_code_seq.prefix` vẫn là `HV`. Không có migration nào cho bảng đếm — bộ đếm không đổi, chỉ chuỗi sinh ra đổi.
3. **Một chỗ duy nhất giữ định dạng**: `packages/shared/src/student-code.ts` — `formatStudentCode`, `parseStudentCode`, `isStudentCode`, `normalizeStudentCodePrefix`, và các hằng số (`-`, width 4, tiền tố mặc định `HV`). `nextCode` (API) và các store giả lập trong test đều gọi hàm này thay vì tự nối chuỗi. Trước đây biểu thức `` `${prefix}${String(n).padStart(4,'0')}` `` được chép tay ở 3 nơi; một định dạng có 3 bản sao là một định dạng sẽ lệch.
4. **Migration đổi mã đã cấp bằng cách chèn dấu phân cách vào CHÍNH chuỗi mã**, không suy lại tiền tố từ cơ sở hiện tại của học viên. Học viên chuyển cơ sở vẫn mang mã có tiền tố cũ; suy lại theo cơ sở sẽ **đổi tiền tố**, tức đổi danh tính của mã — đúng thứ không được phép. Chèn một ký tự thì không đổi gì ngoài dấu phân cách.
5. **Migration idempotent và đảo ngược được**: bỏ qua mã đã ở đúng dạng đích, nên chạy lại không đổi gì; `migrate:down` gỡ đúng dấu phân cách vừa chèn.
6. **Không thêm ràng buộc định dạng vào contract đọc** (`AdminUser.studentCode` vẫn là `z.string()`). Một regex ở đường đọc biến **một** dòng dữ liệu lệch thành lỗi 500 cho **cả** danh sách. Định dạng được bảo đảm ở đường ghi (một hàm sinh mã duy nhất), không phải bằng cách từ chối đọc dữ liệu cũ.

## Consequences

- `HV10001` không còn sinh ra được. `HV-10001` và `HV1-0001` phân biệt được bằng mắt và bằng máy; `parseStudentCode` không phải đoán.
- `assignCodeWithRetry` **vẫn giữ**. Nó không còn cần cho trường hợp tiền tố lồng nhau, nhưng vẫn là lưới an toàn nếu hai lần cấp mã đồng thời lọt qua khe của bộ đếm.
- Mã cũ trong DB được viết lại thành dạng mới. Trong demo không có file Excel/phiếu nào đang lưu hành, nên không mất khả năng khớp. Nếu một trung tâm thật có file cũ, chúng sẽ báo `student_not_found` theo từng dòng — tín hiệu trung thực, và cần một lượt sửa file, không cần thêm đường code nào trong hệ thống.
- Cột mã giờ chứa `-`, nên nhập tay có thể thành `HV - 0001` hoặc `hv-0001`. **Hiện chưa chuẩn hoá** đầu vào import điểm (không trim, không đổi hoa/thường) — cố ý để slice này không kéo thêm hành vi khớp. Ghi nhận ở "Bước tiếp theo" của slice-23-c.
- `branches.code` chứa `-` (vd `AB-CD`) vẫn cho mã parse được (`AB-CD-0001` → tiền tố `AB-CD`), vì `parseStudentCode` cắt ở dấu `-` **cuối cùng** trước phần số.
- Sắp xếp từ điển trên mã vẫn giữ nguyên thứ tự số vì số thứ tự cùng độ dài trong cùng một tiền tố.
- Đảo ngược (`migrate:down`) là nghịch đảo chính xác của `up` cho mọi dòng mà `up` đã sửa. Nếu chạy `down` trên một DB mà `up` **không** sửa dòng nào (dòng đã ở dạng mới từ trước), dấu phân cách của dòng đó sẽ bị gỡ — chấp nhận được vì đó không phải dòng do migration này tạo ra.
