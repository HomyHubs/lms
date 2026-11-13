# Slice 16 — Dashboard Tổng quan

- Cơ chế: Dọc
- Owner hiện tại: —
- Nhánh: —
- PR: —
- Trạng thái: xem `../MVP-BACKLOG.md` (nguồn trạng thái duy nhất)
- Phụ thuộc: slice-7
- Sửa mục gốc: —

## Mục tiêu bấm được / nghiệm thu được

- Admin mở Dashboard (trang chủ `/`): hai biểu đồ cột "Tổng số học viên theo khóa học" và "Tổng số học viên theo cơ sở" hiện con số ngay trên đỉnh mỗi cột, mỗi cột một màu khác nhau.
- Ba biểu đồ tròn ("Tỉ lệ học viên theo cơ sở", "Tỉ lệ hoàn thành bài", "Tỉ lệ điểm danh") hiển thị nhãn gọn, không chồng chữ, đọc được cả khi 3 biểu đồ nằm trên một dòng ở màn hình rộng.
- Thẻ "Tỉ lệ điểm danh" hiển thị đồng thời cho tất cả cơ sở (bỏ ràng buộc phải chọn một lớp như hiện tại).
- Bấm vào một cơ sở ở thẻ "Tỉ lệ điểm danh" → điều hướng sang trang chi tiết cơ sở, hiển thị toàn bộ biểu đồ điểm danh của các lớp (trung tâm) thuộc cơ sở đó.

## Task

| # | Task | Tầng | Ghi chú |
| --- | --- | --- | --- |
| 1 | **Nhãn số trên cột (1.1).** Thêm `<LabelList dataKey="value" position="top">` (recharts) vào `<Bar>` của `StudentsBarChart` và vào `<Bar dataKey="size">` của `ClassSizeByBranchChart` trong `apps/web/src/features/home/DashboardCharts.tsx`. | FE | `LabelList` có sẵn trong recharts 2 (đã import từ `recharts`). |
| 2 | **Đổi tên + màu cột khóa học (1.2).** Đổi `<CardTitle>` "Học viên theo khóa học" → "Tổng số học viên theo khóa học" (`DashboardCharts.tsx`, khối render của `renderBar(stats.studentsByCourse)`); trong `StudentsBarChart` thay `fill={BAR_COLOR}` bằng `<Cell>` mỗi cột một màu lấy từ `SLICE_COLORS`. | FE | Dữ liệu từ `useDashboardStats().studentsByCourse` (gom theo khóa học). Yêu cầu nhắc "3 level Starter/Mover/Flyer" — xem Nợ kỹ thuật nếu phải gom theo cấp độ. |
| 3 | **Đổi tên + màu cột cơ sở (1.3).** Đổi `<CardTitle>` "Học viên theo cơ sở" → "Tổng số học viên theo cơ sở"; cột `stats.studentsByBranch` tô `<Cell>` mỗi cơ sở một màu (`SLICE_COLORS`), dùng cùng bảng màu với pie "Tỉ lệ học viên theo cơ sở" cho nhất quán. | FE | `DashboardCharts.tsx` — `renderBar(stats.studentsByBranch)` + `renderBranchPie`. |
| 4 | **Nhãn pie không chồng chữ (1.4).** Sửa `percentLabel` + `SharePieChart` (dùng chung cho "Tỉ lệ học viên theo cơ sở", `CompletionPieChart`, `AttendancePieChart`) trong `DashboardCharts.tsx`: dùng nhãn ngoài có đường dẫn (label line) hoặc chỉ `<Legend>` kèm %, giảm `outerRadius`/tăng chiều cao `PIE_HEIGHT`, để lưới `md:grid-cols-2 xl:grid-cols-3` không cắt chữ. | FE | Không chồng chữ ở màn hình hẹp lẫn khi 3 pie cùng dòng. |
| 5 | **Tỉ lệ điểm danh cho tất cả cơ sở (1.5).** Thay `AttendancePieChart` (đang bắt chọn 1 lớp qua `useClassRates`) trong `DashboardCharts.tsx` bằng khối hiển thị tỉ lệ điểm danh cho TẤT CẢ cơ sở; mỗi cơ sở là một phần tử bấm được. Lấy danh sách cơ sở bằng `useBranches` (`@/features/centers/useCenters`). | FE | Bỏ `<select>` chọn lớp hiện tại. |
| 6 | **Trang chi tiết cơ sở (1.5).** Thêm page mới (vd `apps/web/src/features/home/BranchAttendancePage.tsx` hoặc feature `branches`) hiển thị toàn bộ biểu đồ điểm danh của các lớp thuộc một cơ sở; `onClick`/`<Link>` ở Task 5 điều hướng tới trang này theo `branchId`. | FE | Route cần thêm vào `App.tsx` — chỉ GHI CHÚ ở Integration notes, không sửa trong slice này. |
| 7 | **API tỉ lệ điểm danh theo cơ sở.** Bổ sung gom theo cơ sở cho `GET /api/attendance/rates` (`apps/api/src/features/attendance/routes.ts` + `service.ts` + `store.ts`): nhận `branchId`, trả `overall` của cơ sở và/hoặc danh sách lớp kèm tỉ lệ, giữ branch-scope slice-1. Tránh FE phải gọi `getAttendanceRates` lặp theo từng lớp. | API | `rates` hiện yêu cầu một bộ lọc (classId...). |
| 8 | **Shared type.** Bổ sung type cho phản hồi tỉ lệ điểm danh theo cơ sở trong `@lms/shared` (`packages/shared`) để FE Task 5/6 dùng chung. | Shared | — |

## Stub cho phép

- Trang chi tiết cơ sở (Task 6) có thể tái dùng `useClassRates` lặp theo từng lớp của cơ sở ở bản đầu; gom thành một endpoint theo cơ sở (Task 7) khi thấy chậm.
- Màu cột theo cấp độ (Starter/Mover/Flyer) chỉ áp dụng khi có dữ liệu gom theo cấp độ; tạm thời tô mỗi cột một màu theo thứ tự trong `SLICE_COLORS`.

## Không được stub

Xác thực, phân quyền, hạn mức, chuỗi hiển thị — trừ khi ghi khác trong ADR.
Branch-scope (admin chỉ thấy cơ sở được phân quyền — slice-1) phải giữ ở cả endpoint tỉ lệ điểm danh theo cơ sở.

## Nợ kỹ thuật

| Marker | Vị trí | Nội dung | Dự kiến trả |
| --- | --- | --- | --- |
| TODO(slice-16) | `DashboardCharts.tsx` — `StudentsBarChart` (khóa học) | Yêu cầu 1.2 nhắc "3 level Starter/Mover/Flyer" nhưng chart đang gom theo khóa học (`studentsByCourse`); cần xác nhận gom theo cấp độ hay theo khóa học | Khi chốt nguồn dữ liệu |
| PERF(slice-16) | Trang chi tiết cơ sở (Task 6) | Nếu lặp `getAttendanceRates` theo từng lớp gây nhiều request, gom thành một endpoint theo cơ sở (Task 7) | Khi có số liệu thật |

## Nhật ký thay đổi phạm vi của riêng Slice/Task này

| Ngày | Loại | Nội dung | Lý do | ADR |
| --- | --- | --- | --- | --- |
| 2026-11-12 | Thêm | Tạo slice | Yêu cầu chỉnh sửa Dashboard Tổng quan (mục 1.1–1.5) | — |

## Cách nghiệm thu

1. Admin mở `/` → biểu đồ "Tổng số học viên theo khóa học" và "Tổng số học viên theo cơ sở" hiện số trên đỉnh mỗi cột, mỗi cột một màu; tiêu đề đã đổi đúng.
2. Ba biểu đồ tròn hiển thị nhãn gọn, không chồng chữ khi cùng nằm trên một dòng (màn hình rộng) và khi xuống 1 cột (màn hình hẹp).
3. Thẻ "Tỉ lệ điểm danh" hiện cho mọi cơ sở (không còn `<select>` chọn lớp); bấm một cơ sở → mở trang chi tiết cơ sở với đủ biểu đồ điểm danh các lớp thuộc cơ sở đó.
4. Admin ở cơ sở khác chỉ thấy cơ sở trong phạm vi được phân quyền (branch-scope).
5. Test tự động: mở rộng `apps/web/src/features/home/DashboardCharts.test.tsx` (nhãn số, màu cột, điều hướng); API `apps/api/src/features/attendance/routes.test.ts` + `store.integration.test.ts` cho tỉ lệ theo cơ sở. Gates PASS.

## Bàn giao phiên gần nhất
