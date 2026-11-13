# Slice 24 — Báo cáo thi & xếp loại

- Cơ chế: Dọc
- Owner hiện tại: —
- Nhánh: —
- PR: —
- Trạng thái: xem `../MVP-BACKLOG.md` (nguồn trạng thái duy nhất)
- Phụ thuộc: slice-13, slice-7
- Sửa mục gốc: —

## Mục tiêu bấm được / nghiệm thu được

- Các panel trong trang "Báo cáo thi" (`/exam-reports`) có phân trang, mỗi trang 50 dòng.
- Dashboard tỉ lệ pass/failed theo Cơ sở, theo Trung tâm (lớp) và theo Cấp độ: thể hiện bằng biểu đồ, kèm % và số lượng.
- Bảng "Xếp hạng học viên" ở trang "Báo cáo & xếp loại" (`/reports`) có phân trang, cho chọn 20 hoặc 50 dòng mỗi trang.

## Task

| # | Task | Tầng | Ghi chú |
| --- | --- | --- | --- |
| 1 | **Phân trang panel báo cáo thi (6.1).** Phân trang 50 dòng cho `DetailTable` (`data.attempts`, hiện render toàn bộ) và `SummaryTable` (`data.byExam`) trong `apps/web/src/features/examhistory/ExamReportsPage.tsx`. Tái dùng mẫu cursor của slice-13 (`useExamHistory`/`useInfiniteQuery` + nút "Tải thêm") hoặc phân trang theo trang. | FE | 50 dòng/trang trùng `HISTORY_PAGE_SIZE` đã dùng cho lịch sử thi. |
| 2 | **API phân trang chi tiết lượt thi (6.1).** `GET /api/reports/exam-attempts` (`apps/api/src/features/examhistory/routes.ts`) hiện trả tối đa `REPORT_ROW_LIMIT`=5000 dòng `attempts` KHÔNG phân trang. Thêm phân trang cursor 50 dòng/trang cho phần chi tiết lượt thi, tái dùng `encodeCursor`/`nextCursor` + `HISTORY_PAGE_SIZE` đã có trong `examhistory/store.ts`; giữ branch-scope như slice-13. | API | Cursor dạng `<started_at>~<id>` như lịch sử thi. |
| 3 | **Dashboard pass/failed (6.1b).** Thêm dashboard tỉ lệ đạt/không đạt theo Cơ sở, theo lớp (trung tâm) và theo Cấp độ vào `ExamReportsPage.tsx`: biểu đồ (recharts `BarChart`/`PieChart` theo mẫu `ReportsPage.tsx`/`DashboardCharts.tsx`), kèm % và số lượng từng nhóm. | FE | Hiển thị cả % lẫn số lượng (đạt / không đạt / tổng). |
| 4 | **API aggregation pass/failed (6.1b).** Bổ sung `byBranch`, `byClass` (trung tâm) và `byLevel` (số lượt / đạt / không đạt + %) vào phản hồi `GET /api/reports/exam-attempts` — `apps/api/src/features/examhistory/service.ts` + `store.ts`. (`reports/service.ts` của slice-7 đã có `byClass`/`byLevel`/`byMonth` cho `StudentReport` nhưng CHƯA có `byBranch` — tham khảo để làm nhất quán.) | API | Giữ branch-scope + bộ lọc hiện có (branchId/classId/from/to). |
| 5 | **Shared type pass/failed (6.1b).** Bổ sung `byBranch`/`byClass`/`byLevel` (và cursor `nextCursor` cho `attempts`) vào type `ExamAttemptReport` trong `@lms/shared` (`packages/shared`). | Shared | — |
| 6 | **Phân trang bảng xếp hạng (8.1).** Thêm phân trang cho `RankingTable` trong `apps/web/src/features/reports/ReportsPage.tsx` với bộ chọn 20/50 dòng mỗi trang. Hiện `data.ranking` render toàn bộ (lọc client theo `search`); phân trang phía client (page + pageSize 20/50) trên danh sách đã lọc. | FE | Giữ ô tìm theo tên/mã HS; đổi trang/đổi pageSize không mất bộ lọc. |
| 7 | **API phân trang xếp hạng (8.1, tùy chọn).** Nếu ranking vượt `REPORT_ROW_LIMIT`=5000, bổ sung phân trang server cho `GET /api/reports/students` (`apps/api/src/features/reports/routes.ts` + `service.ts` + `store.ts`): tính thứ hạng competition (`rankRows`) trên TOÀN BỘ trước, rồi mới cắt trang. | API | Giữ branch-scope slice-7; export (`/reports/students/export`) vẫn chỉ superadmin, không phân trang. |

## Stub cho phép

- Phân trang bảng xếp hạng (Task 6) làm phía client trước (cắt trang trên `data.ranking` đã lọc); chuyển sang phân trang server (Task 7) khi dữ liệu lớn.
- `byBranch`/`byClass`/`byLevel` cho báo cáo thi (Task 3) có thể tính phía client từ `attempts` ở bản đầu nếu chưa kịp thêm aggregation server (Task 4).

## Không được stub

Xác thực, phân quyền, hạn mức, chuỗi hiển thị — trừ khi ghi khác trong ADR.
Branch-scope (admin/GV chỉ thấy dữ liệu trong phạm vi cơ sở được phân quyền — slice-1/slice-7/slice-13), thứ hạng tính trên toàn bộ dữ liệu thật trước khi cắt trang, và số đạt/không đạt lấy từ dữ liệu thật.

## Nợ kỹ thuật

| Marker | Vị trí | Nội dung | Dự kiến trả |
| --- | --- | --- | --- |
| PERF(slice-24) | `apps/api/src/features/examhistory/store.ts` (`REPORT_ROW_LIMIT`=5000) | Báo cáo thi đang giới hạn 5000 dòng; chuyển hẳn phần chi tiết sang cursor để không mất dòng khi vượt 5000 | Khi dữ liệu vượt ngưỡng |
| PERF(slice-24) | `apps/api/src/features/reports/store.ts` (`REPORT_ROW_LIMIT`=5000) | Ranking cũng giới hạn 5000; cân nhắc phân trang server (Task 7) | Khi dữ liệu vượt ngưỡng |

## Nhật ký thay đổi phạm vi của riêng Slice/Task này

| Ngày | Loại | Nội dung | Lý do | ADR |
| --- | --- | --- | --- | --- |
| 2026-11-12 | Thêm | Tạo slice | Yêu cầu phân trang panel (6.1), dashboard pass/failed theo cơ sở/trung tâm/cấp độ (6.1b), phân trang xếp hạng 20/50 (8.1) | — |

## Cách nghiệm thu

1. `/exam-reports`: panel "Chi tiết lượt thi" phân trang 50 dòng ("Tải thêm"/chuyển trang đúng); panel "Theo đề thi" cũng phân trang.
2. Dashboard pass/failed: với bộ lọc đã chọn, biểu đồ + % + số lượng theo Cơ sở, theo lớp và theo Cấp độ khớp dữ liệu thật.
3. `/reports`: bảng xếp hạng đổi được 20 ↔ 50 dòng/trang, chuyển trang, giữ ô tìm; thứ hạng vẫn đúng trên toàn cục.
4. GV cơ sở khác không xem được dữ liệu ngoài phạm vi (403).
5. Test tự động: mở rộng `apps/web/src/features/examhistory/ExamHistoryPage.test.tsx` và `apps/web/src/features/reports/ReportsPage.test.tsx`; API `apps/api/src/features/examhistory/*` + `apps/api/src/features/reports/*` (routes.test + store.integration.test). Gates PASS.

## Bàn giao phiên gần nhất
