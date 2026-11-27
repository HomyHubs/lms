# Slice 27 — Trung tâm & cơ sở: cho sửa thông tin

- Cơ chế: Dọc
- Owner hiện tại: —
- Nhánh: —
- PR: —
- Trạng thái: xem `../MVP-BACKLOG.md` (nguồn trạng thái duy nhất)
- Phụ thuộc: slice-1 (User, Branch & phân quyền)
- Sửa mục gốc: — (tính năng mới; đặc tả mục 10)

## Mục tiêu bấm được / nghiệm thu được
- Trang "Quản lý trung tâm & cơ sở" cho phép **sửa** tên trung tâm ngay tại danh sách (không phải xoá rồi tạo lại).
- Cho phép **sửa** tên và địa chỉ cơ sở ngay tại danh sách cơ sở.
- Sửa xong danh sách tự làm mới; huỷ giữa chừng không đổi dữ liệu.
- Chỉ Admin thấy nút sửa (route đã guard Admin; API đã `requireAdmin`).

## Task
| # | Task | Tầng | Ghi chú |
| --- | --- | --- | --- |
| 0 | Xác minh API đã có sẵn `PATCH /centers/:id` (body `UpdateCenterRequest`) và `PATCH /branches/:id` (body `UpdateBranchRequest`, ít nhất 1 trường) với `requireAdmin` | API | Đã có từ slice-1 (`centers/routes.ts`) — slice này KHÔNG thêm endpoint mới |
| 1 | `apps/web/src/lib/api.ts`: thêm `updateCenter(id, input)` và `updateBranch(id, input)` gọi `PATCH`, parse `CenterResponse`/`BranchResponse` | FE | File dùng chung — thêm hàm, không sửa hàm cũ |
| 2 | `apps/web/src/features/centers/useCenters.ts`: thêm `useUpdateCenter()` và `useUpdateBranch()` (invalidate `['centers']` / `['branches']`) | FE | Theo mẫu `useCreateCenter` |
| 3 | `apps/web/src/features/centers/CentersPage.tsx`: mỗi dòng trung tâm có nút "Sửa" → hiện form inline (ô tên + Lưu/Huỷ); mỗi dòng cơ sở có nút "Sửa" → form inline (tên + địa chỉ + Lưu/Huỷ) | FE | Validate bằng `UpdateCenterRequest`/`UpdateBranchRequest` trước khi gửi |
| 4 | Test `apps/web/src/features/centers/CentersPage.test.tsx`: mở form sửa cơ sở, đổi tên + địa chỉ, bấm Lưu → `PATCH /api/branches/:id` đúng body và danh sách được invalidate; huỷ → không có request | FE | Bổ sung vào test hiện có |

## Stub cho phép
- Chưa cần sửa `centerId` của cơ sở (đổi cơ sở sang trung tâm khác) — ghi nợ kỹ thuật, làm ở slice sau nếu chủ dự án yêu cầu.
- Chưa cần modal/xác nhận phức tạp; form inline là đủ cho phạm vi mục 10.

## Không được stub
Xác thực, phân quyền, hạn mức, chuỗi hiển thị — trừ khi ghi khác trong ADR.
Ngoài ra: không bịa dữ liệu sau khi lưu — phải đọc lại từ API (invalidate query), không tự ghép state cục bộ.

## Nợ kỹ thuật
| Marker | Vị trí | Nội dung | Dự kiến trả |
| --- | --- | --- | --- |
| TODO(slice-27) | `CentersPage.tsx` | Chưa cho đổi cơ sở sang trung tâm khác (`UpdateBranchRequest` không có `centerId`) | Khi chủ dự án yêu cầu |
| TODO(slice-27) | `CentersPage.tsx` | Sửa/xoá chưa có hộp thoại xác nhận; xoá trung tâm cascade sang cơ sở | Khi làm polish UI |

## Nhật ký thay đổi phạm vi của riêng Slice/Task này
| Ngày | Loại | Nội dung | Lý do | ADR |
| --- | --- | --- | --- | --- |
| 2026-11-26 | Tạo | Khởi tạo file slice từ yêu cầu mục 10 | Lập kế hoạch thực thi | — |

## Cách nghiệm thu
- Thủ công: Admin vào `/centers` (hoặc trang Trung tâm cơ sở), bấm "Sửa" ở một cơ sở → đổi tên + địa chỉ → Lưu → dòng hiển thị giá trị mới; tải lại trang vẫn giữ giá trị mới.
- Thủ công: bấm "Sửa" rồi "Huỷ" → không có request PATCH, dữ liệu giữ nguyên.
- Thủ công: user không phải Admin không vào được trang (guard) và gọi thẳng PATCH bị 403 (RBAC sẵn có).
- Test tự động: `CentersPage.test.tsx` (mở form, PATCH đúng body, huỷ không gửi); `apps/api/src/features/centers/routes.test.ts` đã phủ PATCH 200/400/404 từ slice-1.

## Bàn giao phiên gần nhất

- 2026-11-26: Hoàn tất. API `PATCH /centers/:id` + `PATCH /branches/:id` đã có từ slice-1 nên slice này chỉ làm FE.
- `apps/web/src/lib/api.ts`: thêm `updateCenter`, `updateBranch` (PATCH + parse `CenterResponse`/`BranchResponse`).
- `apps/web/src/features/centers/useCenters.ts`: thêm `useUpdateCenter`, `useUpdateBranch` (invalidate `['centers']`/`['branches']`).
- `apps/web/src/features/centers/CentersPage.tsx`: sửa inline tên trung tâm; sửa inline tên + địa chỉ cơ sở (Lưu/Huỷ), validate bằng `UpdateCenterRequest`/`UpdateBranchRequest` trước khi gửi.
- Test: `CentersPage.test.tsx` thêm case sửa cơ sở (PATCH đúng URL + body, form đóng sau khi lưu) và case huỷ (không phát sinh PATCH). 3/3 test PASS; typecheck + eslint `--max-warnings=0` PASS.
- Chưa làm (nợ ghi ở mục Nợ kỹ thuật): đổi cơ sở sang trung tâm khác, hộp thoại xác nhận khi xoá.
