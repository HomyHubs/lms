# Slice/Task slice-15 — Đồng bộ hiển thị họ tên học viên

- Cơ chế: Dọc
- Owner hiện tại: —
- Nhánh: dev
- PR: — (commit thẳng trên `dev`, chưa push)
- Trạng thái: xem `../MVP-BACKLOG.md` (nguồn trạng thái duy nhất, không ghi trùng ở đây để tránh lệch)
- Phụ thuộc: slice-5 (chấm điểm), slice-6 (điểm danh), slice-13 (lịch sử thi & báo cáo)
- Sửa mục gốc: để trống (slice mới, cross-cutting trên UI của slice-5/6/13)

## Mục tiêu bấm được / nghiệm thu được

Trên mọi màn trước đây dùng **số điện thoại** làm định danh học viên, hiển thị **họ tên** (dạng `họ + chữ lót` rồi `tên`) với SĐT làm dòng phụ. Khi học viên chưa có hồ sơ tên thì **fallback về SĐT** như cũ (không vỡ dữ liệu cũ). Các màn trong phạm vi:

- Điểm danh (màn Điểm danh) — roster lớp.
- Chấm điểm (hàng đợi chấm tay) — queue chấm.
- Báo cáo thi & chi tiết lượt thi — bảng chi tiết + export Excel.

## Task

| # | Task | Tầng | Ghi chú |
| --- | --- | --- | --- |
| 1 | Điểm danh: `AttendanceRosterEntry` + API `listRoster` join tên + render + test | shared/api/web | Commit `e24a0f9` |
| 2 | Chấm điểm: `ManualGradingItem` + store join + `GradingPage` + test | shared/api/web | Commit `3c4aee6` |
| 3 | Báo cáo thi: `ExamAttemptDetail` + store join + `ExamReportsPage` + export Excel (cột "Học viên") + test | shared/api/web | Commit `3c4aee6` |
| 4 | Seed họ tên có dấu cho staff/teacher thay cho SQL one-off (`staffFullName`) | api (seed) | Commit `c703d8b` |
| 5 | Teacher roster (Ngày công & giờ dạy): tên GV/NV ở 2 bảng + export Excel cột "Họ tên" | shared/api/web | Màn `WorkHoursPage` |

## Hợp đồng (contract) đã chốt

- Các DTO thêm cặp trường **nullable, default `null`**: `firstName`/`lastName` (roster) và `studentFirstName`/`studentLastName` (grading item, exam attempt detail).
- Quy ước hiển thị: `lastName + firstName`; nếu cả hai rỗng → dùng `studentPhone`/`phone`.
- Thứ tự sắp xếp roster: theo `last_name`, `first_name`, rồi `phone`.

## Stub cho phép

Không có. Dùng DB thật qua store (join `users.first_name/last_name`); UI render dữ liệu thật.

## Không được stub

Xác thực, phân quyền, hạn mức, chuỗi hiển thị đa ngôn ngữ — trừ khi ghi khác trong ADR.

## Nợ kỹ thuật

| Marker | Vị trí | Nội dung | Dự kiến trả |
| --- | --- | --- | --- |
| — | `WorkSessionDetail` (chi tiết buổi dạy) | Vẫn chỉ hiển thị SĐT cho GV theo lịch / GV dạy ở bảng chi tiết buổi; chưa ghép tên (phạm vi roster đã đủ cho nhu cầu hiện tại) | Khi cần |
| — | DB dev | Tên staff/teacher ban đầu được nạp bằng SQL one-off; nay đã có nguồn chính thức trong seed (`staffFullName`). DB dev hiện tại chỉ đồng bộ lại khi chạy `seed:demo --reset` | Khi reset dataset demo |

## Nhật ký thay đổi phạm vi của riêng Slice/Task này

| Ngày | Loại | Nội dung | Lý do | ADR |
| --- | --- | --- | --- | --- |
| 2026-11-11 | Thêm | Tách việc đồng bộ tên thành slice-15 riêng (cross-cutting trên slice-5/6/13) | Việc đụng nhiều màn, cần một mục chỉ mục ổn định | — |

## Cách nghiệm thu

- `pnpm --filter @lms/shared build`, `pnpm --filter @lms/api typecheck`, `pnpm --filter @lms/web typecheck` đều sạch.
- `pnpm --filter @lms/api test` và `pnpm --filter @lms/web test` xanh (test roster/grading/exam-report khẳng định tên hiển thị, ví dụ `Nguyễn Minh An`).
- Mở từng màn: học viên có tên → hiện tên + SĐT phụ; học viên chưa có tên → hiện SĐT.

## Lịch sử commit (trên `dev`, chưa push)

- `e24a0f9` — feat(attendance): hiện họ tên học viên ở màn Điểm danh (fallback SĐT).
- `3c4aee6` — feat(grading,reports): đồng bộ hiện họ tên học viên ở màn chấm điểm và báo cáo (fallback SĐT).
- `c703d8b` — feat(seed): seed họ tên có dấu cho staff/teacher thay cho SQL one-off.
- (commit hiện tại) — feat(workhours): hiện họ tên GV/NV ở màn Ngày công & giờ dạy + export (fallback SĐT).

## Bàn giao phiên gần nhất

Đã hoàn tất toàn bộ các màn trong phạm vi slice-15: Điểm danh, Chấm điểm, Báo cáo thi, seed tên staff/teacher, và teacher roster (Ngày công & giờ dạy). Nợ còn lại chỉ là tên GV ở bảng "Chi tiết buổi" của màn Ngày công (xem mục Nợ kỹ thuật) — không chặn.
