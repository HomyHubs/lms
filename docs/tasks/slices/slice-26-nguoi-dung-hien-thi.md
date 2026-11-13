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
- Chỉ thay đổi cách hiển thị và cách tính dẫn xuất; không đổi dữ liệu lưu trong DB.

## Task
| # | Task | Tầng | Ghi chú |
| --- | --- | --- | --- |
| 1 | `apps/web/src/features/users/UsersPage.tsx`: bỏ cột SĐT riêng (`<th>Số điện thoại</th>` ~dòng 181 và `<td>{u.phoneNumber}</td>` ~dòng 195); đưa `phoneNumber` vào ô "Họ tên" dưới dạng dòng phụ nhỏ (ô "Họ tên" ~dòng 196–200) | FE | Bảng hiện có các cột: Số điện thoại, Họ tên, Năm sinh, Tuổi, Giới tính, SĐT phụ huynh, Email, Vai trò |
| 2 | Rà `apps/web/src` bằng Grep `phoneNumber` để áp cùng mẫu "SĐT nhỏ dưới tên" ở các nơi khác hiển thị tên user (màn chi tiết, dropdown chọn user, các bảng khác) | FE | Giữ nhất quán toàn app, không chỉ `UsersPage` |
| 3 | Cột "Tuổi" (`<th>Tuổi</th>` ~dòng 184, `<td>{u.age ?? '—'}</td>` ~dòng 202): chỉ hiển thị cho role học viên; role khác để trống | FE | Tuổi với admin/teacher/staff không có ý nghĩa nghiệp vụ |
| 4 | `apps/api/src/features/users/service.ts` `toAdminUser()` (~dòng 79): rà lại công thức `age = new Date().getFullYear() - birthYear`; chỉ tính `age` cho role học viên; làm rõ quy ước (tuổi theo năm sinh, độ chính xác theo năm) | API | Hiện `age` được tính cho MỌI role; chỉ `birth_year` được lưu, `age` không lưu |
| 5 | `packages/shared/src/users.ts`: xác nhận type `age`/`birthYear` (`birthYear: number | null`, `age` dẫn xuất); nếu đổi semantics (chỉ học viên) thì cập nhật mô tả/contract cho khớp FE+BE | Shared | Type dùng chung giữa hai đầu |
| 6 | Nếu đã có helper dựng "họ tên đầy đủ" (slice-15 đồng bộ hiển thị tên), tái dùng cho ô "Họ tên" thay vì tự nối chuỗi rời rạc tại `UsersPage` | FE | Tránh trùng logic hiển thị tên |

## Stub cho phép
- Không có stub chức năng. Nếu ẩn hẳn cột "Tuổi" làm vỡ layout bảng, tạm để "—" cho role khác thay vì bỏ cột.

## Không được stub
Xác thực, phân quyền, hạn mức, chuỗi hiển thị — trừ khi ghi khác trong ADR.

## Nợ kỹ thuật
| Marker | Vị trí | Nội dung | Dự kiến trả |
| --- | --- | --- | --- |
| TODO(slice-26) | `apps/api/src/features/users/service.ts` (`toAdminUser`) | Tuổi tính từ `birth_year` nên sai lệch tới ±1 so với tuổi thật; muốn chính xác cần `birth_date` | Khi có nhu cầu + migration `birth_date` (slice sau) |

## Nhật ký thay đổi phạm vi của riêng Slice/Task này
| Ngày | Loại | Nội dung | Lý do | ADR |
| --- | --- | --- | --- | --- |
| 2026-11-12 | Tạo | Khởi tạo file slice từ yêu cầu 9.1 (hiển thị) + 9.2 | Lập kế hoạch thực thi | — |

## Cách nghiệm thu
- Thủ công: mở `/users` → mỗi dòng hiển thị họ tên to, số điện thoại nhỏ ngay bên dưới; không còn cột "Số điện thoại" riêng.
- Thủ công: học viên có năm sinh → cột "Tuổi" hiện số đúng; user role admin/teacher/staff → không hiện tuổi.
- Test tự động: component test `UsersPage` kiểm tra tên + SĐT phụ cùng ô; `apps/api/src/features/users/service.test.ts` cho `age` chỉ tính với học viên và các biên (null `birthYear`, năm hiện tại).

## Bàn giao phiên gần nhất
