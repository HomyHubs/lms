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
- ~~Màu cột theo cấp độ chỉ áp dụng khi có dữ liệu gom theo cấp độ~~ — **đã áp dụng thật 2026-11-27**: `LEVEL_COLORS` cố định cho starter/mover/flyer, không còn là stub.

## Không được stub

Xác thực, phân quyền, hạn mức, chuỗi hiển thị — trừ khi ghi khác trong ADR.
Branch-scope (admin chỉ thấy cơ sở được phân quyền — slice-1) phải giữ ở cả endpoint tỉ lệ điểm danh theo cơ sở.

## Nợ kỹ thuật

| Marker | Vị trí | Nội dung | Dự kiến trả |
| --- | --- | --- | --- |
| PERF(slice-16) | Trang chi tiết cơ sở (Task 6) | Nếu lặp `getAttendanceRates` theo từng lớp gây nhiều request, gom thành một endpoint theo cơ sở (Task 7) | Khi có số liệu thật |

> `TODO(slice-16)` (gom theo cấp độ hay theo khóa học) đã **trả xong 2026-11-27** — xem nhật ký thay đổi phạm vi.

## Nhật ký thay đổi phạm vi của riêng Slice/Task này

| Ngày | Loại | Nội dung | Lý do | ADR |
| --- | --- | --- | --- | --- |
| 2026-11-12 | Thêm | Tạo slice | Yêu cầu chỉnh sửa Dashboard Tổng quan (mục 1.1–1.5) | — |
| 2026-11-27 | Sửa | Cột "Tổng số học viên" gom **theo cấp độ** (Starter/Mover/Flyer) thay vì theo khóa học; chi tiết từng khóa học chuyển vào tooltip. Tiêu đề thành "Tổng số học viên theo cấp độ". | Yêu cầu 1.2 nhắc rõ "3 level Starter/Mover/Flyer" trong khi tiêu đề cũ nói "theo khóa học" — hai câu mâu thuẫn. Chủ dự án chốt 2026-11-27: ưu tiên cấp độ, vẫn giữ thông tin khóa học trong tooltip. | — |

## Cách nghiệm thu

1. Admin mở `/` → biểu đồ "Tổng số học viên theo cấp độ" (3 cột Starter/Mover/Flyer, mỗi cấp một màu cố định; rê chuột thấy chi tiết từng khóa học) và "Tổng số học viên theo cơ sở" hiện số trên đỉnh mỗi cột; tiêu đề đã đổi đúng.
2. Ba biểu đồ tròn hiển thị nhãn gọn, không chồng chữ khi cùng nằm trên một dòng (màn hình rộng) và khi xuống 1 cột (màn hình hẹp).
3. Thẻ "Tỉ lệ điểm danh" hiện cho mọi cơ sở (không còn `<select>` chọn lớp); bấm một cơ sở → mở trang chi tiết cơ sở với đủ biểu đồ điểm danh các lớp thuộc cơ sở đó.
4. Admin ở cơ sở khác chỉ thấy cơ sở trong phạm vi được phân quyền (branch-scope).
5. Test tự động: mở rộng `apps/web/src/features/home/DashboardCharts.test.tsx` (nhãn số, màu cột, điều hướng); API `apps/api/src/features/attendance/routes.test.ts` + `store.integration.test.ts` cho tỉ lệ theo cơ sở. Gates PASS.

## Bàn giao phiên gần nhất

### 2026-11-27 — agent (nhánh `dev`, trả nợ `TODO(slice-16)`)

**Đã làm:**
- Chốt nguồn dữ liệu: gom **theo cấp độ**, chi tiết khóa học trong tooltip (chủ dự án quyết định).
- `apps/web/src/features/home/dashboard-stats.ts` (mới): hàm thuần `buildStudentsByLevel(levels, courses, classes, countByClass)` — cộng dồn `Enrollment → Class → Course → Level`, sắp cố định Starter→Mover→Flyer (không theo alphabet, không theo thứ tự API), giữ cấp độ 0 học viên để biểu đồ luôn đủ 3 cột, bỏ cấp độ lạ ngoài `LEVEL_CODES`.
- `useDashboardStats.ts`: thêm query `['levels']` (dùng chung cache với `useLevels()`), trả `studentsByLevel: LevelChartDatum[]`. **Bỏ `studentsByCourse`** vì không còn nơi nào dùng (tránh code chết).
- `DashboardCharts.tsx`: `StudentsByLevelChart` + `LevelBarTooltip` (tổng cấp + từng khóa, ẩn khóa 0 học viên); `LEVEL_COLORS` cố định theo cấp; tiêu đề "Tổng số học viên theo cấp độ"; gỡ marker `TODO(slice-16)`.
- Test: `dashboard-stats.test.ts` (6 case — cộng dồn, thứ tự cấp, cấp 0 học viên, chi tiết khóa, cấp lạ, mảng rỗng) + `DashboardCharts.test.tsx` cập nhật mock sang `studentsByLevel` và thêm case "Chưa có dữ liệu" khi cả 3 cấp bằng 0.

**Gates:** web typecheck ✅, eslint `--max-warnings=0` ✅, test web 116 PASS (28 file).

**Lưu ý cho người review:** nhãn số trên đỉnh cột và màu cột **không assert được trong jsdom** (recharts cần container có kích thước thật) — cần kiểm tra bằng mắt trên trình duyệt.

### 2026-11-13 — agent (nhánh `feature/slice-16-dashboard-tong-quan`, trạng thái Review)

**Đã làm (cả 8 task):**
- FE `apps/web/src/features/home/DashboardCharts.tsx`:
  - Task 1: thêm `<LabelList position="top">` cho cột (học viên/khóa học, học viên/cơ sở, và sĩ số từng lớp) → hiện số trên đỉnh cột.
  - Task 2+3: đổi tiêu đề thành "Tổng số học viên theo khóa học" / "Tổng số học viên theo cơ sở"; `StudentsBarChart` nhận prop `colors` và tô mỗi cột một màu từ `SLICE_COLORS` (cùng bảng màu với pie cơ sở). Có `TODO(slice-16)` về việc gom theo cấp độ vs khóa học.
  - Task 4: `percentLabel` chỉ còn hiện `%` + `labelLine={false}`, `outerRadius` 72→60, `PIE_HEIGHT` 240→260 → nhãn pie không chồng khi 3 pie cùng dòng.
  - Task 5: bỏ `AttendancePieChart` (chọn 1 lớp qua `<select>`); thay bằng `AttendanceByBranch` dùng `useBranches()` — mỗi cơ sở là một `<Link to="/attendance/branch/:id">`.
- Task 6: trang mới `apps/web/src/features/home/BranchAttendancePage.tsx` (bar ratePercent theo từng lớp của cơ sở + tỉ lệ chung + link về Dashboard). Route `/attendance/branch/:branchId` (role `admin`) thêm vào `apps/web/src/App.tsx`.
- Task 7+8 (API + Shared): `GET /api/attendance/rates?branchId=` trả `BranchAttendanceRates` ({ branchId, overall, classes[] }). Thêm `branchId` vào `AttendanceRatesQuery`; type `BranchClassRate`/`BranchAttendanceRates` trong `@lms/shared`; `aggregateBranchRates` + `listBranchClassRecords` (service/store); client `getBranchAttendanceRates` + hook `useBranchRates`. RBAC: admin ngoài scope → 404, teacher query theo branch → 403; đường cũ (classId/courseId/studentId) giữ nguyên.

**Gates đã chạy:** `@lms/shared build` ✅, `@lms/api typecheck` ✅, `@lms/web typecheck` ✅. CHƯA chạy được ở phiên này (môi trường shell không flush được output của vitest/lint): `@lms/web test`, `@lms/api test`, lint, và `store.integration.test.ts` (cần Postgres). **Người review cần chạy đầy đủ** `pnpm -r test` + `pnpm -r lint` trước khi merge.

**Nợ kỹ thuật:** `TODO(slice-16)` (DashboardCharts.tsx — chốt gom theo cấp độ vs khóa học), `PERF(slice-16)` (BranchAttendancePage.tsx — nếu nhiều lớp gây chậm thì tối ưu thêm).

**Lưu ý git:** có một stash `slice-19 wip stash before slice-16` (WIP slice-19 trên `dev`) cần `git stash pop` khi quay lại `dev`; sẽ xung đột ở `apps/web/src/lib/api.ts` và `packages/shared/src/index.ts` — cần hợp nhất thủ công.
