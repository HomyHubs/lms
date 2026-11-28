# Slice 26 — Người dùng (hiển thị)

- Cơ chế: Dọc
- Owner hiện tại: —
- Nhánh: —
- PR: —
- Trạng thái: xem `../MVP-BACKLOG.md` (nguồn trạng thái duy nhất)
- Phụ thuộc: slice-1 (User, Branch & phân quyền)
- Sửa mục gốc: — (tính năng mới; đặc tả mục 9.1 phần hiển thị + 9.2)

## Mục tiêu bấm được / nghiệm thu được
- Trên màn danh sách và chi tiết người dùng, số điện thoại hiển thị nhỏ ngay dưới họ tên (không còn là một cột riêng tách rời).
- Cột/giá trị "Tuổi" chỉ áp dụng cho role học viên và được tính đúng theo quy ước đã chốt.
- Chỉ thay đổi cách hiển thị và cách tính dẫn xuất; không đổi dữ liệu lưu trong DB. *(Ngoại lệ 2026-11-27: thêm cột `users.birth_date` để trả nợ tuổi ±1 — xem ADR 0018 và nhật ký thay đổi bên dưới. Không sửa/xoá dữ liệu đã có.)*

## Task
| # | Task | Tầng | Ghi chú |
| --- | --- | --- | --- |
| 1 | `apps/web/src/features/users/UsersPage.tsx`: bỏ cột SĐT riêng (`<th>Số điện thoại</th>` ~dòng 181 và `<td>{u.phoneNumber}</td>` ~dòng 195); đưa `phoneNumber` vào ô "Họ tên" dưới dạng dòng phụ nhỏ (ô "Họ tên" ~dòng 196–200) | FE | Bảng hiện có các cột: Số điện thoại, Họ tên, Năm sinh, Tuổi, Giới tính, SĐT phụ huynh, Email, Vai trò |
| 2 | Rà `apps/web/src` bằng Grep `phoneNumber` để áp cùng mẫu "SĐT nhỏ dưới tên" ở các nơi khác hiển thị tên user (màn chi tiết, dropdown chọn user, các bảng khác) | FE | Giữ nhất quán toàn app, không chỉ `UsersPage` |
| 3 | Cột "Tuổi" (`<th>Tuổi</th>` ~dòng 184, `<td>{u.age ?? '—'}</td>` ~dòng 202): chỉ hiển thị cho role học viên; role khác để trống | FE | Tuổi với admin/teacher/staff không có ý nghĩa nghiệp vụ |
| 4 | `apps/api/src/features/users/service.ts` `toAdminUser()` (~dòng 79): rà lại công thức `age = new Date().getFullYear() - birthYear`; chỉ tính `age` cho role học viên; làm rõ quy ước (tuổi theo năm sinh, độ chính xác theo năm) | API | Hiện `age` được tính cho MỌI role; chỉ `birth_year` được lưu, `age` không lưu |
| 5 | `packages/shared/src/users.ts`: xác nhận type `age`/`birthYear` (`birthYear: number | null`, `age` dẫn xuất); nếu đổi semantics (chỉ học viên) thì cập nhật mô tả/contract cho khớp FE+BE | Shared | Type dùng chung giữa hai đầu |
| 6 | Nếu đã có helper dựng "họ tên đầy đủ" (slice-15 đồng bộ hiển thị tên), tái dùng cho ô "Họ tên" thay vì tự nối chuỗi rời rạc tại `UsersPage` | FE | Tránh trùng logic hiển thị tên |
| 7 | **Trả nợ (ADR 0018)**: migration `20261127000000_users_birth_date.sql` thêm `users.birth_date date` (nullable, additive, không backfill) | DB | Không suy ra được ngày/tháng từ `birth_year`; backfill `01-01` sẽ tạo dữ liệu sai |
| 8 | `apps/api/src/platform/db.ts`: thêm `birth_date` vào `UsersTable`, đọc dạng chuỗi `YYYY-MM-DD` (theo mẫu `to_char(...)` của `attendance/store.ts`, tránh `pg` trả `Date` lệch timezone) | API | — |
| 9 | `packages/shared/src/users.ts`: thêm `birthDate` (`YYYY-MM-DD`, nullable) vào `AdminUser`; `BirthDate` validate ngày có thật + không ở tương lai; create/update nhận `birthDate`, vẫn nhận `birthYear`; gửi cả hai mà lệch năm → lỗi validate | Shared | Tương thích ngược: payload cũ chỉ có `birthYear` vẫn parse được |
| 10 | `apps/api/src/features/users/age.ts` (mới): `todayInVN`, `ageFromBirthDate`, `ageFromBirthYear`, `displayAge` — hàm thuần, nhận `today` dạng `YYYY-MM-DD` để test tất định | API | Tính theo `Asia/Ho_Chi_Minh`, không theo giờ máy chủ |
| 11 | `apps/api/src/features/users/service.ts`: `toAdminUser` dùng `displayAge`; `birthYear` dẫn xuất từ `birthDate` khi có; xoá `TODO(slice-26)` | API | — |
| 12 | `apps/api/src/features/users/store.ts`: `SAFE_COLUMNS` + `createUser`/`updateUser` mang `birth_date` | API | — |
| 13 | `apps/web/src/features/users/UsersPage.tsx`: giữ ô "Năm sinh" (`type=number`) làm trường **chính**, thêm ô "Ngày sinh đầy đủ (tuỳ chọn)" (`type=date`) cho tuổi chính xác; bảng hiện năm sinh từ `birthYear` và tuổi ước lượng kèm `~` + tooltip khi chỉ biết năm | FE | Chủ sở hữu chốt 2026-11-27: nhập chỉ năm sinh là đủ (dữ liệu cũ chỉ có năm) — xem ADR 0018 mục 5 |

## Stub cho phép
- Không có stub chức năng. Nếu ẩn hẳn cột "Tuổi" làm vỡ layout bảng, tạm để "—" cho role khác thay vì bỏ cột.

## Không được stub
Xác thực, phân quyền, hạn mức, chuỗi hiển thị — trừ khi ghi khác trong ADR.

## Nợ kỹ thuật
| Marker | Vị trí | Nội dung | Dự kiến trả |
| --- | --- | --- | --- |
| ~~TODO(slice-26)~~ | ~~`apps/api/src/features/users/service.ts` (`toAdminUser`)~~ | ~~Tuổi tính từ `birth_year` nên sai lệch tới ±1 so với tuổi thật; muốn chính xác cần `birth_date`~~ | **Đã trả 2026-11-27** (ADR 0018, migration `20261127000000_users_birth_date.sql`) |
| ~~TODO(slice-26-b)~~ | `apps/api/src/features/users/age.ts` (`ageFromBirthYear`) | ~~Học viên chỉ có `birth_year` vẫn lệch ±1~~ → **Chấp nhận 2026-11-27** theo quyết định chủ sở hữu: dữ liệu cũ của trung tâm chỉ có năm sinh và "chỉ nhập năm sinh là được". FE hiển thị `~` để nói rõ là ước lượng; nhập bổ sung ngày sinh thật thì tự chuyển sang tuổi chính xác | Không trả — quy ước đã chốt |

## Nhật ký thay đổi phạm vi của riêng Slice/Task này
| Ngày | Loại | Nội dung | Lý do | ADR |
| --- | --- | --- | --- | --- |
| 2026-11-12 | Tạo | Khởi tạo file slice từ yêu cầu 9.1 (hiển thị) + 9.2 | Lập kế hoạch thực thi | — |
| 2026-11-27 | Mở rộng | Thêm Task 7–13: thêm cột `birth_date`, contract `birthDate`, helper tuổi, đổi ô nhập ở FE | Trả nợ `TODO(slice-26)`: tuổi lệch ±1 vì chỉ có năm sinh | 0018 |
| 2026-11-27 | Thu hẹp | Form nhập **năm sinh là chính**, ngày sinh đầy đủ chỉ là tuỳ chọn (Task 13 điều chỉnh) | Chủ sở hữu chốt: dữ liệu cũ chỉ có năm sinh, "chỉ nhập năm sinh là được" — không được bắt buộc ngày đầy đủ | 0018 |

## Cách nghiệm thu
- Thủ công: mở `/users` → mỗi dòng hiển thị họ tên to, số điện thoại nhỏ ngay bên dưới; không còn cột "Số điện thoại" riêng.
- Thủ công: học viên có năm sinh → cột "Tuổi" hiện số đúng; user role admin/teacher/staff → không hiện tuổi.
- Thủ công (ADR 0018): học viên có **ngày sinh** → tuổi đúng kể cả trước sinh nhật trong năm; học viên chỉ có **năm sinh** → tuổi hiện kèm `~` và tooltip giải thích.
- Test tự động: component test `UsersPage` kiểm tra tên + SĐT phụ cùng ô; `apps/api/src/features/users/service.test.ts` cho `age` chỉ tính với học viên và các biên (null `birthYear`, năm hiện tại).
- Test tự động (ADR 0018): `apps/api/src/features/users/age.test.ts` phủ biên sinh nhật (hôm trước / đúng ngày / hôm sau), 29/02, ngày không tồn tại, chỉ-có-năm; `service.test.ts` phủ trường hợp `birthDate` thắng `birthYear`; `store.integration.test.ts` xác nhận `birth_date` đọc ra đúng chuỗi `YYYY-MM-DD` (không lệch timezone).
- Test tự động: `UsersPage.test.tsx` phủ 3 đường nhập — chỉ năm sinh (gửi `birthYear`, không gửi `birthDate`), năm + ngày đầy đủ (gửi cả hai), và năm lệch ngày (báo lỗi tại FE, không gửi request).

## Bàn giao phiên gần nhất
- 2026-11-27: trả nợ `TODO(slice-26)`. Thêm `users.birth_date` + contract `birthDate` + helper `age.ts`; FE đổi ô nhập sang `type=date` và đánh dấu tuổi ước lượng bằng `~`. Chi tiết quyết định ở `docs/adr/0018-tuoi-hoc-vien-birth-date.md`.
- Còn lại (không làm được bằng code): dữ liệu cũ chỉ có năm sinh vẫn lệch ±1 — xem `TODO(slice-26-b)`.
