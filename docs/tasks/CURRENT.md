# Task hiện tại (chỉ dùng khi làm tuần tự một mình)

Phạm vi sử dụng: chỉ dùng khi đúng một người/agent làm tuần tự.

## Đang làm

- ID Slice/Task: không còn slice nào mở trong backlog (slice-9 đã **hủy** 2026-11-26 — xem bên dưới).
- Cập nhật ngày: 2026-11-28
- Nhánh: `dev` (đã merge vào `main`)
- Trạng thái: Đã trả **toàn bộ** marker nợ còn lại của phiên này: `slice-26`, `slice-26-b`→quy ước, `slice-20`, `slice-21`, `slice-23` phần retry, `slice-23` hướng an toàn, `slice-23` gỡ hẳn fallback SĐT (ADR 0019), `slice-23-b` (ADR 0020), `slice-1` (ADR 0021), `slice-23-c` đổi định dạng mã (ADR 0022), `slice-31` mã cơ sở duy nhất (ADR 0023), `slice-32` menu theo năng lực (ADR 0024). Không còn `TODO(<slice>)` nào trong code.

## Đã làm (phiên 2026-11-28, phần 9)

- **`slice-31` — mã cơ sở là duy nhất (ADR 0023)**: migration `20261128000001_branches_code_unique.sql` tạo partial unique index trên `upper(btrim(code))`, kèm `do $$ … raise exception` liệt kê mã đang trùng **trước khi** tạo index.
  - **Vì sao**: từ ADR 0022, mã học viên = `<branches.code>-<số thứ tự>`; hai cơ sở trùng `code` dùng chung bộ đếm và sinh cùng một dãy mã. Mã vẫn unique (`users_student_code_unique` chặn trùng) nên **không có dữ liệu sai** — chỉ mất khả năng "đọc mã biết cơ sở", tức đúng thứ ADR 0022 vừa sửa. Lỗi im lặng hoàn toàn.
  - Khoá duy nhất dùng **biểu thức** chứ không phải cột thô: `normalizeStudentCodePrefix` trim trước khi dùng làm khoá bộ đếm nên `'HV'` và `'HV '` chắc chắn đụng nhau; `'hv'`/`'HV'` cho hai dãy mã nhìn gần như giống nhau. Chặn cả ba ở tầng DB.
  - Migration **dừng có chủ ý** khi dữ liệu đang trùng. Tự đổi tên cơ sở sẽ làm mã học viên đã cấp trỏ sai cơ sở — tệ hơn việc bắt người vận hành quyết định.
  - **Không mở đường sửa `branches.code`**: nó không có trong contract `Branch` lẫn request tạo/sửa; API không đọc/ghi cột này. Cho sửa là tính năng riêng (phải chốt mã đã cấp giữ tiền tố cũ hay đổi theo) — ADR 0023 §Decision 4.
  - Test: `apps/api/src/features/centers/store.integration.test.ts` 3 case trên Postgres thật (trùng hệt, trùng sau trim/upper, nhiều cơ sở không mã).
- **`slice-32` — menu và cổng route của FE tính từ ma trận quyền (ADR 0024)**: `NavItem.permissions` thay `roles`; `RequireAuth` nhận `permission` và gọi `canAny`; `App.tsx` truyền `item.permissions` cho 17 route menu + quyền cho 2 route ngoài menu.
  - **Vì sao không chỉ "dùng lại quyền"**: tập role của menu **không bằng** tập role của quyền API ở ba chỗ — Điểm danh là **hợp** của `attendance.read` (admin, teacher) và `attendance.self` (student); Chấm bài **hẹp hơn** `grading.grade` (staff chấm bài nhưng không đi qua màn này); Quản lý thi là hub mở cho cả `exam.manage` lẫn `exam.take`. Ép bằng nhau là đổi hành vi sản phẩm.
  - Thêm 2 quyền diễn đạt menu: `grading.menu` {admin, teacher}, `enrollment.manage` {admin}. Quyền `.menu` **chỉ để điều hướng, không dùng làm guard API** — ghi ngay cạnh khai báo.
  - Giữ nguyên việc superadmin thấy menu của admin (không thấy "Bài thi của tôi"), nên hành vi không đổi. "Thấy menu gì" và "được vào không" là hai câu hỏi khác nhau.
  - Test: `components/layout/nav.test.ts` 13 case khoá tập path theo **từng role**; `App.test.tsx` xanh **không sửa kỳ vọng nào**; `permissions.test.ts` thêm case `canAny` + 2 quyền mới.
  - **Flake ghi nhận**: `ReportsPage.test.tsx` (đọc lại XLSX) fail 1 lần khi chạy song song cả web suite, pass khi chạy riêng và pass lần chạy lại — nghi timeout dưới tải, không liên quan slice này.
- Cổng: lint 4/4, typecheck 5/5, shared **64**, api **327 pass** (+38 skip cục bộ vì không có Docker), web **142**, build OK. Migration + integration test mới chỉ chạy thật ở CI.

## Đã làm (phiên 2026-11-27, phần 8)

- **`slice-23-c` — định dạng mã học viên có dấu phân cách `HV-0001` (ADR 0022)**: chủ dự án chốt đổi, vì dự án còn ở demo nên ràng buộc "mã đã in trên phiếu/thẻ" của ADR 0020 không còn đúng.
  - **Vì sao đổi**: ADR 0020 sửa **bộ đếm** nhưng **chuỗi mã vẫn mơ hồ** — `HV`+10001 và `HV1`+1 đều cho `HV10001`. Unique index chặn trùng nên không có dữ liệu sai, nhưng không ai đọc mã biết được nó thuộc cơ sở nào, và mọi đoạn parse đều phải đoán ranh giới. ADR 0020 chữa triệu chứng; dấu phân cách chữa nguyên nhân.
  - `packages/shared/src/student-code.ts` (mới) là **nơi duy nhất** giữ định dạng: `STUDENT_CODE_SEPARATOR`, `STUDENT_CODE_SEQ_WIDTH`, `DEFAULT_STUDENT_CODE_PREFIX`, `normalizeStudentCodePrefix`, `formatStudentCode`, `parseStudentCode`, `isStudentCode`. Trước đây biểu thức `` `${prefix}${String(n).padStart(4,'0')}` `` được chép tay ở **3 nơi** (store thật + 2 store giả lập).
  - Dấu phân cách thuộc về **định dạng**, không thuộc về tiền tố: `branches.code` vẫn `HV`, khoá `student_code_seq.prefix` vẫn `HV` → **không có migration nào cho bảng đếm**.
  - Migration `20261127000002_student_code_separator.sql`: chèn `-` bằng regex trên **chính chuỗi mã** (`^([^0-9]+)([0-9]+)$` → `\1-\2`), **không** suy lại tiền tố từ cơ sở hiện tại — học viên chuyển cơ sở phải giữ tiền tố cũ, suy lại là đổi danh tính của mã. Bỏ qua mã đã đúng dạng nên idempotent; `down` gỡ đúng dấu vừa chèn.
  - **Sửa một lỗi mà chính định dạng mới gây ra**: `students/store.ts` tìm theo mã bằng `like '%q%'` trên chuỗi thô, nên gõ `HN0001` (thói quen cũ / dán từ file cũ) **không** tìm ra `HN-0001`. Nay so khớp bỏ dấu phân cách ở **cả hai phía**, dùng hằng số từ `@lms/shared` để định dạng không bị chép lại trong SQL. Test `students/service.test.ts` giữ nguyên ca gõ `'hn0001'` (đúng thứ nó đang bảo vệ) và thêm ca gõ có/không dấu.
  - Test: `packages/shared/src/student-code.test.ts` 12 case (zero-pad, dài ra khi >9999, tiền tố rỗng → `HV`, tiền tố lồng nhau, tiền tố chứa `-`, từ chối dạng cũ, round-trip); `users/store.integration.test.ts` assert tuyệt đối `Q9-0001`/`Z7-0001`/`Z71-0001`/`Z7-0002`/`Z71-0002`; `students/store.integration.test.ts` **+2 case** chạy câu SQL `replace()` thật; fixture `HN-0001` ở users/students/web.
  - Cổng: lint 4/4, typecheck 5/5, shared **60**, api **327 pass** (+35 skip local vì máy không có Docker), web **129**, build OK.
  - **Chưa kiểm được cục bộ**: migration và câu SQL `replace()` chỉ chạy thật trên Postgres ở CI (`dev-health-check` chạy `dbmate up → down → up` + integration test). Lần đầu viết xong SQL đó, tôi đã suýt coi "CI xanh" là bằng chứng — nhưng không có test nào gọi `searchStudents`, nên câu SQL chưa từng chạy. Đã thêm 2 case integration để CI thật sự chạy nó.
  - **Cố ý để ngoài phạm vi**: import điểm chưa trim/đổi hoa-thường cột mã nên `HV - 0001` sẽ không khớp (ADR 0022 §Consequences).

## Đã làm (phiên 2026-11-27, phần 7)

- **`slice-1` — quyền là ma trận role → năng lực (ADR 0021)**: hướng tối thiểu, **không đổi schema và không đổi hành vi phân quyền**.
  - **Gõ kiểu `role`**: `UsersTable.role` và `UserRecord.role` nay là `UserRole`, bỏ hẳn `user.role as PublicUser['role']` trong `toPublicUser`. Lệch giữa DB và contract thành **lỗi compile** — đúng thứ cast cũ đã che. Việc gõ kiểu lập tức lộ 6 chỗ dựa vào `role: string`: 4 helper test, `WORKER_ROLES` (`string[]` lọt qua được), và tham số `role: string` của `seed-demo`.
  - `packages/shared/src/permissions.ts` (mới): `PERMISSIONS` (26 mã `<miền>.<hành động>`), `ROLE_PERMISSIONS` (ma trận duy nhất), `can()`. `superadmin` lấy nguyên mảng `PERMISSIONS` thay vì liệt kê tay nên thêm quyền mới thì superadmin có ngay.
  - `rbac.requirePermission(...)` thay `requireRole(...)` tại mọi route có phân quyền (nhiều quyền = AND); `requireRole` chỉ còn cho route **chỉ cần đăng nhập** (2 chỗ).
  - `isAllowed(role, roles)` giữ luật "superadmin vượt mọi guard" ở một chỗ, dùng chung cho `requireRole` (BE) và `RequireAuth` (FE). `branchScopeOf(user, scope)` giữ luật superadmin vượt branch-scope, thay biểu thức lặp lại trong `exams`, `students`, `reports`.
  - `users/routes.ts`: bỏ `makeRequireAdmin` tự viết (bản sao thứ bảy của logic resolve phiên + so role), dùng `rbac.requirePermission('user.manage')`; `UsersRoutesDeps` nhận `rbac` thay `authStore`; `sessionRole` dùng `getSessionUser` thay cast.
  - Test: `packages/shared/src/permissions.test.ts` 11 case (không trùng mã, không mã chết, không mã gõ sai, superadmin đủ, admin không export được, teacher không import điểm được…) + `access/rbac.test.ts` 5 case (401 thiếu phiên, 401 phiên chết, 403 thiếu quyền, superadmin qua, route chỉ-cần-đăng-nhập).
  - **Không làm** bảng `permissions`/`role_permissions`/`user_permissions`: chỉ đáng khi trung tâm cần cấp quyền lẻ từng người.


## Đã làm (phiên 2026-11-27, phần 6)

- **`slice-23-b` — bộ đếm mã học viên có chỗ trú ngụ thật (ADR 0020)**: `nextCode` thôi quét `student_code like '<prefix>%'` (cách này khiến cơ sở `HV` và `HV1` dùng chung bộ đếm, đẩy số thứ tự của `HV` lên 10002) và chuyển sang bảng `student_code_seq` khoá theo **tiền tố**.
  - Cấp số bằng một câu lệnh nguyên tử `insert … values (prefix, 2) on conflict (prefix) do update set next_value = next_value + 1 returning next_value` — không `select` trước nên hai request đồng thời không thể đọc cùng một giá trị. Giữ `assignCodeWithRetry` làm lưới an toàn.
  - Khoá là **tiền tố** chứ không phải `branch_id`: tiền tố chính là thứ quyết định chuỗi mã, nên hai cơ sở tình cờ dùng chung `branches.code` **buộc phải** chung bộ đếm (tách ra thì chúng cấp trùng số và retry vô ích).
  - **Không đổi định dạng mã đã cấp.** Phương án `HV-0001` bị loại: mã đã in trên phiếu/thẻ và nằm trong file Excel của trung tâm, mà sau ADR 0019 không còn fallback cứu. Migration seed quy mã cũ về đúng cơ sở của học viên (không dùng `like`), và **được phép đếm dư** — dư chỉ làm số bắt đầu cao, thiếu mới gây trùng.
  - Test: `users/store.integration.test.ts` thêm ca hồi quy với cặp tiền tố lồng nhau `Z7`/`Z71` (assert tuyệt đối `Z70001`, `Z710001`, `Z70002` — không phải `Z710002`), xoá sạch bộ đếm của hai tiền tố đó trước khi chạy để tất định trên DB dùng chung.

## Đã làm (phiên 2026-11-27, phần 5)

- **`slice-23` gỡ hẳn fallback SĐT (ADR 0019)**: chủ dự án chốt ngược với hướng an toàn buổi sáng — **bỏ đường khớp bằng SĐT, giữ số điện thoại như dữ liệu bình thường** (cột `users.phone_number`, `GradingRow.student_phone`, hồ sơ, hàng đợi chấm không đổi byte nào).
  - `exams/service.ts`: `matchGradingRow(code, byCode)` chỉ tra theo mã và trả `GradingMatch` (`matched` | `looks_like_phone` | `not_found`); `importGrades` bỏ `allowedPhones` (còn 6 tham số), `previewImportGrades` còn 5. Phạm vi tính theo `allowedStudentCodes`, cohort theo lớp dùng `listStudentCodesInClasses` (mới).
  - **Bù lại việc mất fallback**: dòng không khớp mã mà giá trị ở cột mã có dạng SĐT Việt Nam (`0` + 9–10 chữ số, chịu dấu cách/chấm/gạch) → lý do mới `student_code_looks_like_phone`, UI hiện "Cột mã đang là số điện thoại — cần đổi sang mã học viên". Kiểm **sau** khi tra theo mã nên trung tâm dùng chính SĐT làm mã vẫn nhập được.
  - Contract bỏ `matchedByPhone`/`matchedBy` (chỉ có nghĩa khi còn fallback) → không để lại trường luôn mang một giá trị duy nhất. Store bỏ `listStudentPhonesInBranches`/`listStudentPhonesInClasses`.
  - **Sửa một chỗ trùng lặp đã gây lỗi thật**: `GradeImportSkipReason` trong `service.ts` được **chép tay** thay vì dẫn xuất từ `@lms/shared`, nên thêm giá trị mới vào shared mà API vẫn báo lỗi type. Nay là `(typeof GRADE_IMPORT_SKIP_REASONS)[number]`.
  - Test: `grade-import-preview.test.ts` viết lại (9 case, gồm `looksLikePhoneNumber` + ca "trung tâm dùng SĐT làm mã vẫn khớp" + ca cohort theo lớp), `service.test` 3 case, `GradingPage.test.tsx` ca cảnh báo. Cổng: lint 4/4, typecheck 5/5, api **320 pass** (+32 skip local), web **129 pass**, build OK.

## Đã làm (phiên 2026-11-27, phần 4)

- **`slice-23` hướng an toàn — fallback SĐT không còn im lặng** (`bcb23e2`): chủ dự án chọn **giữ** fallback (chưa chứng minh được 100% học viên có `student_code`; gỡ ra sẽ biến file Excel cũ của trung tâm thành `student_not_found`) nhưng bắt nó **lộ ra** thay vì khớp âm thầm.
  - Tách `matchGradingRow(code, byCode, byPhone)` trả `{ row, matchedBy }`; `importGrades` và `previewImportGrades` dùng **chung** hàm này. Nhân dịp này lộ ra một lỗi có sẵn: bản xem trước chỉ khớp theo SĐT, nên file dùng mã học viên hiện "không tìm thấy" ở bước xem trước nhưng **vẫn nhập được** ở bước ghi — bản xem trước nói dối. Đã hết.
  - `previewImportGrades` nhận thêm `allowedStudentCodes` và áp đúng **scope kép** (mã ∪ SĐT) như bước ghi; route preview dựng scope giống route commit.
  - `GradeImportSummary.matchedByPhone` chỉ ghi dòng **thực sự** được áp (`won`), không ghi dòng bị bỏ qua vì lý do khác. Contract shared thêm `GRADE_IMPORT_MATCHED_BY`, `GradeImportResult.matchedByPhone` (`.default([])`), `GradeImportPreviewRow.matchedBy` (`.default(null)`) → payload cũ vẫn parse được.
  - FE: dải cảnh báo `role="status"` trên bảng xem trước + nhãn `· khớp SĐT` từng dòng; cảnh báo sau khi nhập kèm số dòng. Dùng `status` chứ không `alert` vì đây là thông tin bổ sung, không chặn thao tác.
  - Test: `grade-import-preview` +5 case (khớp mã, khớp SĐT, scope theo mã, preview không còn báo sai, `matchedBy=null` khi không khớp), `service.test` cập nhật, `GradingPage.test.tsx` +1 case. Cổng: lint 4/4, typecheck 5/5, api **318 pass** (+32 integration skip ở máy local), web **129 pass**, build OK; `dev-health-check` xanh.

## Đã làm (phiên 2026-11-27, phần 3)

- **`slice-26` — cho nhập chỉ năm sinh** (`fb08269`): bản sửa trước đổi hẳn ô nhập sang `type=date` nên chặn mất đường nhập chỉ-năm. Giờ form có "Năm sinh" (chính) + "Ngày sinh đầy đủ (tuỳ chọn)"; nhập cả hai mà lệch năm thì contract báo lỗi tại FE. Chủ sở hữu chốt: dữ liệu cũ chỉ có năm sinh và **nhập năm sinh là đủ** → `TODO(slice-26-b)` chuyển thành **quy ước được chấp nhận** (tuổi hiển thị `~`), không còn là nợ.
- **`slice-20` — bỏ N+1 khi xem trước đề** (`9d8b26c`): `GET /exam-sets?ids=a,b,c` trả summary (title + itemCount) trong một request; `ExamPreview` chuyển từ `useQueries` (gọi từng bộ) sang một `useQuery`, vẫn giữ thứ tự phục vụ theo `examSetIds`. Test: `ExamPreview.test` 3 case + `shared/exam-sets.test` 6 case.
- **`slice-21` — kéo-thả sắp xếp câu trong bộ đề** (`4d3f6b9`): native HTML5 DnD trên `li` (chỉ khi nháp), thả vào đâu gọi lại `move(from,to)` sẵn có. **Giữ** nút Lên/Xuống làm đường bàn phím (kéo-thả một mình không truy cập được) — có test khoá lại. Marker cũ nằm ở `ExamSetPreview` là sai chỗ (màn chỉ đọc) → đã diễn giải lại.
- **Vá test flaky** `ReportsPage` phân trang: bỏ `some(call)` (phụ thuộc 300ms debounce + CPU) → assert tham số của lần gọi **cuối** với timeout 3000ms. Test này đã fail 2 lần do tranh CPU khi chạy song song.

## Đã làm (phiên 2026-11-27, phần 2)

- **Trả nợ `TODO(slice-26)` — tuổi học viên lệch ±1 (ADR 0018)**: gốc lỗi là `age = new Date().getFullYear() - birth_year` — công thức trả "tuổi sẽ đạt trong năm nay", nên ai chưa qua sinh nhật bị dư 1 tuổi (học viên sinh 30/12/2015 xem ngày 27/11/2026 hiện 11 thay vì 10). Vì Starter/Mover/Flyer phân theo độ tuổi nên sai lệch này ảnh hưởng xếp lớp.
  - Migration `20261127000000_users_birth_date.sql` thêm `users.birth_date date` (nullable, additive). **Không backfill** từ `birth_year`: không suy ra được ngày/tháng, đặt mặc định `01-01` chỉ biến "thiếu dữ liệu" thành "dữ liệu sai".
  - `apps/api/src/features/users/age.ts` (mới): `todayInVN`, `parseIsoDate`, `ageFromBirthDate`, `ageFromBirthYear`, `displayAge` — hàm thuần, nhận `today` dạng `YYYY-MM-DD`, mọi so sánh theo `Asia/Ho_Chi_Minh` (không theo giờ máy chủ).
  - Contract: `AdminUser.birthDate` + `birthYear` là hai mức chính xác của cùng một dữ liệu; có `birthDate` thì `birthYear` dẫn xuất từ đó. Create/update nhận `birthDate`, vẫn nhận `birthYear` (tương thích ngược); gửi cả hai mà lệch năm → lỗi validate.
  - `store.ts`: đọc `birth_date` qua `to_char(..., 'YYYY-MM-DD')` (theo mẫu `attendance/store.ts`) để `pg` không trả `Date` lệch ngày; đường ghi dùng `.returning('id')` + đọc lại thay vì nhét biểu thức vào `RETURNING`.
  - FE: ô "Năm sinh" → ô "Ngày sinh" (`type=date`); cột Năm sinh hiện thêm ngày sinh nhỏ bên dưới; tuổi chỉ-biết-năm-sinh hiển thị `~11` + tooltip để không giả vờ chính xác.
  - Test: `age.test.ts` 15 case (3 ngày quanh sinh nhật, 29/02, ngày không tồn tại, tương lai), `service.test.ts` +4 case, `users/store.integration.test.ts` (mới, 4 case trên Postgres thật — cũng phủ `assignStudentCode` lần đầu), `packages/shared/src/users.test.ts` (mới, 14 case).
  - Cổng: lint 4/4, typecheck 5/5, test shared 31 + api 314 (+32 integration skip ở máy local) + web 120, build OK.
  - Còn lại: dữ liệu cũ chỉ có năm sinh vẫn lệch ±1 — không sửa được bằng code (`TODO(slice-26-b)`), cần nhập bổ sung ngày sinh thật.
- **Phát hiện thêm khi viết integration test (`TODO(slice-23-b)`)**: `nextCode` lấy `max(số thứ tự)` trên `student_code like '<prefix>%'` mà tiền tố không có dấu phân cách, nên hai cơ sở có `code` lồng nhau dùng chung bộ đếm — cơ sở `HV` và `HV1` khiến mã `HV10001` của cơ sở sau bị tính vào bộ đếm `HV` (quan sát thật trên DB test: mã sinh ra là `HV10002`). Unique index vẫn chặn trùng nên **không sinh mã trùng**, chỉ số thứ tự xấu đi. Sửa cần đổi định dạng mã + migrate mã đã cấp → để slice riêng; đã ghi marker + nới assertion của test cho đúng bản chất.

### Việc trước đó

- ID Slice/Task: vá cổng gác CI + 2 lỗi thật lộ ra khi chạy integration test (ADR 0017)
- Cập nhật ngày: 2026-11-26
- Nhánh: `dev`
- Trạng thái: Done — `dev-health-check` xanh với đủ 304 test (trước: 282 pass + 22 skip).

## Đã làm (phiên 2026-11-27)

- **Merge `dev` → `main` (`196be90`)**: `main` thiếu 63 commit của `dev` và có 9 commit deploy riêng → merge `--no-ff`, không xung đột. Giữ nguyên phần chỉ có trên `main`: root `vercel.json` vẫn đã xoá (`008247f`), `apps/web/vercel.json` không đổi. Lockfile/workspace lấy bản của `dev` (vite 7.3.8, vitest 4.1.12, kysely 0.28.17, minimatch 11.0.9).
- Cổng gác trên cây đã merge: lint 4/4, typecheck 5/5, test shared 17 + api 282 (+22 integration skip vì máy local không có `TEST_DATABASE_URL`) + web 113, build OK; chạy thêm đúng lệnh Vercel (`VITE_DEMO=1 vite build`) → OK.
- **Dependabot về 0**: graph cập nhật ngay sau push, nhưng alerts treo 130 suốt ~33 phút rồi tự đóng (`open=0`, `fixed=130`). Không cần tắt/bật lại Dependabot; job tính lại alert chạy bất đồng bộ tới ~30-40 phút.
- **Trả nợ `TODO(slice-16)`**: chủ dự án chốt cột "Tổng số học viên" gom **theo cấp độ** (Starter/Mover/Flyer), chi tiết khóa học nằm trong tooltip. Thêm `apps/web/src/features/home/dashboard-stats.ts` (hàm thuần `buildStudentsByLevel`), `StudentsByLevelChart` + `LevelBarTooltip` trong `DashboardCharts.tsx`, màu cố định theo cấp (`LEVEL_COLORS`); bỏ `studentsByCourse` khỏi `useDashboardStats` vì hết nơi dùng. Test: `dashboard-stats.test.ts` 6 case + cập nhật `DashboardCharts.test.tsx`.
- **Trả nợ `TODO(slice-30)` — đồng bộ công thức xếp loại**: tách `finalScore`/`classify`/`passed` sang `apps/api/src/platform/grading.ts` (reports re-export để không phá import cũ); `attendance/service.ts` thêm `ratePercentFromCounts` dùng chung. Hồ sơ học viên giờ theo đúng ADR 0006: điểm thi = trung bình điểm cao nhất **mỗi đề** (SQL `max` theo `exam_id`), chuyên cần loại vắng CÓ PHÉP khỏi mẫu số, `finalScore` có trọng số theo policy cấp độ, `classify` theo ngưỡng policy thay vì 90/75/50 cứng. Thêm `students/store.integration.test.ts` (5 case trên Postgres thật) vì phần SQL này không thể kiểm bằng unit test.
- **Trả nợ `TODO(slice-30)` — gộp truy vấn hồ sơ**: `loadExamAgg` + `loadAttendanceAgg` + `loadStudyAgg` → một `loadAggregates` (1 truy vấn, các subselect trên cùng dòng `users`), hồ sơ còn 2 round-trip thay vì 4.
- **Trả nợ `TODO(slice-24)` — phân trang ranking phía server**: `GET /reports/students` nhận `page`/`pageSize`/`q`, trả thêm `rankingPage`; `buildStudentReport` tính thứ hạng + các số tổng hợp trên toàn phạm vi **rồi mới** lọc `q` và cắt trang, nên `rank` vẫn toàn cục và panel không đổi khi tìm. FE bỏ cắt trang client, ô tìm debounce 300ms. Đính chính: `reports/store.ts` **không** có `.limit()` — ranking trước đây trả toàn bộ, không phải bị chặn 5000.
- **Trả một phần nợ `TODO(slice-23)`**: gộp `nextStudentCode` + `setStudentCode` thành `assignStudentCode` (store) dùng `assignCodeWithRetry` — gặp unique violation thì sinh lại mã và thử lại (tối đa 5 lần), hết cảnh hai request tạo đồng thời cùng prefix ra trùng số thứ tự. Bỏ 2 method cũ khỏi `UsersStore` (không còn nơi dùng). Test: `users/store.test.ts` 4 case. **Chưa gỡ** fallback khớp SĐT trong import điểm — cần xác nhận dữ liệu thật đã phủ 100% `student_code`.


## Đã làm (phiên 2026-11-26)

- Trả nợ slice-17: `components/ui/date-picker.tsx` (calendar popover in-house) thay `<input type="date">`; test lọc ngày trong `AttendancePage.test.tsx` (stub đúng schema `TodayClassSummary` có `startsAt`). slice-17 → Done.
- Đồng bộ backlog với git log: slice-23 (#39), slice-30 (#40), slice-1.1 (#38), slice-6.1 (3185e7d), slice-10.1 (#34) → Done; thêm dòng chỉ mục cho `slice-10.1` và `slice-dashboard-movements`.
- slice-27: sửa inline trung tâm/cơ sở (FE + api `updateCenter`/`updateBranch`, hook, test).
- slice-28: chặn xoá lớp còn học viên (409), `LevelRoadmap` (Starter→Mover→Flyer), cột khoá học, test API + FE.
- slice-29: trang "Ghi danh & Quản lý" 2 panel (HV/GV theo lớp, quản lý theo cơ sở), đổi nhãn menu, test.
- slice-25: `work-hours-detail.ts` (thuần) + chi tiết theo giáo viên, bảng/biểu đồ giờ dạy theo lớp, test.
- slice-dashboard-movements phần 3: rà 4 nhóm báo cáo; bổ sung biểu đồ thanh + tròn cho điểm danh (`TodayBarChart` theo ngày đang chọn, `TodayAttendanceBoard` theo bộ lọc cơ sở) + test đổi theo bộ lọc.
- slice-dashboard-movements phần 4: xác minh đã triển khai từ `d6190a3` (admin chấm công thay GV, `recorded_by` + `now()` trong `shift_events`, unique index chống trùng ca, 404 ngoài phạm vi, lịch sử thời điểm + người thao tác) — chỉ cập nhật tài liệu, không cần code thêm.
- Gia cố slice-30: `studentCode` lấy thật từ `users.student_code` (hết hardcode `null`), tìm kiếm theo mã học viên, panel "Thời gian học" (`study`: số buổi + tổng phút, chỉ tính buổi `present`/`late`), cột "Mã HV" ở danh sách; thêm `routes.test.ts` (14 case) + component test `StudentsPage` (3) / `StudentDetailPage` (3); stub `ResizeObserver` toàn cục trong `src/test/setup.ts` để recharts chạy được dưới jsdom.
- Cổng sau gia cố: API typecheck + eslint sạch, 282 pass / 22 skip; Web typecheck + eslint sạch, 113 pass; `vite build` OK (cảnh báo chunk >500 kB là có sẵn).
- **Hủy `slice-9`** theo quyết định chủ sở hữu: bỏ hẳn chấm bán tự động; audio/ghi âm cho Listening/Speaking **không xây trong LMS** — giáo viên tự chấm và đưa kết quả vào lớp bằng luồng đã có (`slice-9a` chấm tay/import Excel + `slice-22` đưa điểm vào lớp). Trạng thái backlog `Hoãn` → `Đã hủy`; gỡ marker `TODO(slice-9)` ở migration `20260921000000_questions.sql` và 4 slice doc (`slice-3`, `slice-5`, `slice-6`, `slice-12`); cập nhật ADR 0003/0013, `AGENTS.md`, `HANDOFF-BY-CATEGORY.md`, `design/ui-reference.md`. Không sửa code nghiệp vụ.
- **Vá lỗ hổng phụ thuộc (ADR 0016)**: `pnpm audit` 82 advisory (5 critical, 28 high) → **0**. Nâng `fastify` 5.0.0→5.12.8, `kysely` 0.27.4→0.28.17, `react-router-dom` 7.1.1→7.18.7, `zod` 3.23.8→4.6.7; `vite` 5.4.8→7.3.8, `@vitejs/plugin-react` 4.3.2→5.2.0, `vitest` 2.1.2→4.1.12, `postcss` 8.4.47→8.5.33, `turbo` 2.1.3→2.11.13, `tsx` 4.19.1→4.23.15; ghim phụ thuộc gián tiếp trong `pnpm-workspace.yaml` (pnpm 11 bỏ `pnpm.overrides` ở `package.json`). Sửa kèm: 7 chỗ `invalid_type_error`→`error` (zod 4 bỏ tham số này), 142 UUID fixture không đúng RFC 4122 (zod 4 kiểm tra version/variant chặt), thêm `vitest.config.ts` cho `apps/api` và `packages/shared` để Vitest 4 không nhặt `dist/**/*.test.js` (gây chạy test 2 lần: API 282→564).
- **Vá cổng gác CI (ADR 0017)**: `dev-health-check.yml` thêm Postgres thật + `dbmate up` + `TEST_DATABASE_URL` để 22 test tích hợp không bị skip. Khi bật lên thì lộ 2 lỗi có sẵn: (1) **2 cặp migration trùng version** (`20261115000000`, `20261120000000`) làm `dbmate up` chết trên DB mới → đổi tên file thứ hai sang `...0001` (cả hai đều idempotent); (2) `examhistory/store.ts#selectScopedAttempts` thiếu `e.ended_at is null` nên báo cáo theo cơ sở/lớp vẫn tính lượt thi của học viên đã nghỉ (trái spec slice-1.1) → đã thêm filter. `ci.yml` trên PR đã đỏ từ 2026-11-21 vì đúng lỗi migration này. Thêm nữa: integration test dùng chung DB `lms_test` nên **không được chạy song song** (lần chạy thứ 2 fail 5 test do timeout 5s/10s) → tách `apps/api/vitest.config.ts` thành 2 project, `integration` chạy tuần tự với timeout 30s. Đã xác nhận xanh 2 lần liên tiếp.

## Bước tiếp theo

1. ~~Chạy cổng gác đầy đủ `pnpm -r build && pnpm -r lint && pnpm -r typecheck && pnpm -r test` trên `dev` trước khi release.~~ **Đã chạy 2026-11-26: build 3/3, lint 4/4, typecheck 5/5, test 5/5 — tất cả PASS.** Từ 2026-11-26 `dev-health-check` chạy đủ **304 test** trên Postgres thật (không còn 22 skip).
2. Kiểm tra giao diện thật trên trình duyệt/màn hình hẹp cho các biểu đồ mới (mới chỉ test jsdom — `ResponsiveContainer` không đo được kích thước trong jsdom nên test chỉ assert số liệu/nhãn).
3. ~~`slice-9` vẫn Hoãn — cần chủ dự án chốt phạm vi.~~ **Đã chốt 2026-11-26: hủy slice-9.**
4. Cân nhắc mở PR cho các commit trực tiếp trên `dev` nếu repo chuyển sang luồng review bắt buộc.
5. Đồng bộ công thức xếp loại học lực giữa `students/service.ts` và `reports/service.ts` khi slice-7 chốt (đang ghi nợ `TODO(slice-30)`).
6. (Tùy chọn, ngoài phạm vi slice) Bundle web còn 1 chunk ~1.06 MB — có thể `manualChunks` tách recharts/vendor nếu muốn hết cảnh báo >500 kB.
7. Nếu sau này cần nhắc điểm danh tự động hoặc audio trong LMS: **mở slice mới** (ID slice-9 không tái sử dụng), trả lời 3 câu ở mục "Nếu sau này muốn mở lại" trong `slices/slice-9-mo-rong.md`.
8. ~~Sau khi push, mở lại trang Dependabot của repo để xác nhận GitHub đã đóng cảnh báo.~~ **Đã xác nhận 2026-11-27: `open=0`, `fixed=130`.**
9. Kiểm thử tay trên trình duyệt sau khi nâng Vite 7 / vitest 4 / zod 4: luồng tạo đề (parse body số câu/thời lượng), trang báo cáo, và dev server `pnpm dev` (Vite 7 đổi một số mặc định về `server.fs`).
10. Bộ ba `vite` 7 / `vitest` 4 / `zod` 4.6 còn rất mới — nếu gặp lỗi lạ khi dev, nghi vấn đầu tiên nên là chúng. Đường lùi: revert commit vá phụ thuộc rồi `pnpm install` (lockfile đi kèm commit).
