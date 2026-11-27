# Slice 23-c — Định dạng mã học viên có dấu phân cách (`HV-0001`)

- Cơ chế: Dọc
- Owner hiện tại: —
- Nhánh: `dev` (commit trực tiếp, cùng lý do như ADR 0019–0021)
- PR: —
- Trạng thái: xem `../MVP-BACKLOG.md` (nguồn trạng thái duy nhất, không ghi trùng ở đây để tránh lệch)
- Phụ thuộc: slice-23 (Done), slice-23-b (Done — bộ đếm theo tiền tố)
- Sửa mục gốc: **slice-23**
- ADR: `docs/adr/0022-dinh-dang-ma-hoc-vien-co-dau-phan-cach.md` (thay Decision 4 của ADR 0020)

## Mục tiêu bấm được / nghiệm thu được

- Học viên mới nhận mã dạng `HV-0001`, `HN-0001`, `Q9-0001` — có dấu `-` giữa tiền tố cơ sở và số thứ tự.
- Mã **đã cấp** trước đây được viết lại sang dạng mới trong cùng migration, **không đổi tiền tố** (chỉ chèn một ký tự).
- `HV10001` (mơ hồ: cơ sở `HV` số 10001 hay cơ sở `HV1` số 1?) không còn sinh ra được; `parseStudentCode('HV-10001')` và `parseStudentCode('HV1-0001')` trả về hai kết quả khác nhau.
- Định dạng chỉ tồn tại ở **một** chỗ (`packages/shared/src/student-code.ts`); `nextCode` và các store giả lập trong test đều gọi nó thay vì tự nối chuỗi.
- Migration đảo ngược được, chạy lại không đổi gì (idempotent).

## Task

| # | Task | Ghi chú |
| --- | --- | --- |
| 1 | `packages/shared/src/student-code.ts` (mới): `STUDENT_CODE_SEPARATOR`, `STUDENT_CODE_SEQ_WIDTH`, `DEFAULT_STUDENT_CODE_PREFIX`, `normalizeStudentCodePrefix`, `formatStudentCode`, `parseStudentCode`, `isStudentCode`; export từ `index.ts` | Định dạng là hợp đồng dùng chung FE-BE, phải ở package chia sẻ (AGENTS.md mục 17) |
| 2 | `apps/api/src/features/users/store.ts`: `nextCode` dùng `formatStudentCode` + `normalizeStudentCodePrefix`; bỏ hằng số cục bộ `DEFAULT_CODE_PREFIX`/`CODE_SEQ_WIDTH` | Xoá bản sao thứ nhất của biểu thức nối chuỗi |
| 3 | Migration `db/migrations/20261127000002_student_code_separator.sql`: chèn `-` vào mã đã cấp bằng regex trên **chính chuỗi mã**; bỏ qua mã đã đúng dạng; `down` gỡ đúng dấu vừa chèn | Không suy lại tiền tố từ cơ sở hiện tại — học viên chuyển cơ sở vẫn mang tiền tố cũ |
| 4 | Test: `student-code.test.ts` (shared); cập nhật `users/store.integration.test.ts` (`Q9-0001`, `Z7-0001`, `Z71-0001`…), 2 store giả lập, fixture `users`/`students` route test, 2 fixture web, ca `looksLikePhoneNumber` trong `grade-import-preview.test.ts` | Assertion cũ khoá đúng chuỗi `Q90001`/`Z70001` nên phải đổi theo |

## Stub cho phép

- Không có. Slice này nhỏ và đổi đúng một thứ.

## Không được stub

Xác thực, phân quyền, hạn mức, chuỗi hiển thị — trừ khi ghi khác trong ADR.
Ngoài ra: **không** được để migration ở dạng "chạy được một lần" — nó phải idempotent và đảo ngược được (AGENTS.md mục 16), vì harness CI chạy up → down → up cho toàn bộ migration.

## Nợ kỹ thuật

| Marker | Vị trí | Nội dung | Dự kiến trả |
| --- | --- | --- | --- |
| — | — | Không phát sinh nợ mới. Cột mã giờ có `-` nên nhập tay có thể thành `HV - 0001` / `hv-0001`; import điểm **chưa** trim/đổi hoa-thường. Cố ý để ngoài phạm vi (xem ADR 0022 §Consequences) | Cân nhắc khi có file Excel thật của trung tâm |

## Nhật ký thay đổi phạm vi của riêng Slice/Task này

| Ngày | Loại | Nội dung | Lý do | ADR |
| --- | --- | --- | --- | --- |
| 2026-11-27 | Tạo | Slice mới sửa mục gốc slice-23: đổi định dạng mã sang `<tiền tố>-<số thứ tự>` + migrate mã đã cấp | Ràng buộc "mã đã in trên giấy" của ADR 0020 không còn đúng (dự án còn ở demo); chuỗi mã vẫn mơ hồ khi tiền tố lồng nhau | 0022 |

## Cách nghiệm thu

- Tự động: `packages/shared/src/student-code.test.ts` — `formatStudentCode('HV', 1) === 'HV-0001'`, số > 9999 dài ra (`HV-10000`), `parseStudentCode` tách đúng với tiền tố lồng nhau (`HV-10001` → `HV`/10001, `HV1-0001` → `HV1`/1), tiền tố rỗng rơi về `HV`, chuỗi không đúng dạng trả `null`.
- Tự động: `apps/api/src/features/users/store.integration.test.ts` trên Postgres thật — mã sinh ra khớp `/^HV-\d{4,}$/`, bộ đếm của `Q9` cho `Q9-0001`, cặp lồng nhau `Z7`/`Z71` cho `Z7-0001`/`Z71-0001`/`Z7-0002`/`Z71-0002`.
- Thủ công: `dbmate up` trên DB có học viên mã cũ → mã thành `HV-0001`; `down` → về `HV0001`; `up` lại → `HV-0001` và không đổi gì thêm.
- Thủ công: tạo học viên mới trong màn Người dùng → cột Mã học viên hiện `HV-0001`; import điểm bằng mã đó khớp đúng học viên.

## Bàn giao phiên gần nhất

Điền theo mẫu `../../ai-workflow/templates/session-handoff.md` khi dừng giữa chừng.
