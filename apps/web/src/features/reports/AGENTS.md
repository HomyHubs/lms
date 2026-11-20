# AGENTS.md — web/reports (Báo cáo học viên & xếp loại)

Nhật ký này thuộc riêng feature/nhánh này. Cập nhật liên tục, tối thiểu mỗi ngày làm việc, ngay cả khi task chưa xong. Đây là nơi nhiều dev làm song song mà không đụng file nhau.

## Bối cảnh feature

- Nhiệm vụ: trang báo cáo học viên (`ReportsPage`) — bảng xếp hạng, phân loại, chính sách xếp loại, và phân trang bảng xếp hạng.
- Slice/Task đang triển khai: slice-24, xem `docs/tasks/slices/slice-24-bao-cao-thi-xep-loai.md`
- Phụ thuộc module nào, qua cửa công khai nào: `@lms/shared` (`StudentReport`); API `GET /api/reports/students`, `.../classification-policies`.
- Owner hiện tại: Hoang Hoang HA
- Nhánh: feature/slice-24-bao-cao-thi-xep-loai

## Contract (cửa công khai — chốt trước, không đổi giữa chừng)

- `ReportsPage.tsx`: component trang báo cáo (default export qua route).
- `report-export.ts`: `reportToSheets(report)` → dữ liệu xuất XLSX (không đổi trong slice-24).

## Nhật ký liên tục (thêm mục mới mỗi ngày, không ghi đè mục cũ)

### 2026-11-14

**Đã xong**
- Phân trang bảng xếp hạng phía client: state `pageSize` (20/50, mặc định 20) + `page`; `useEffect` reset về trang 1 khi đổi search/pageSize/query.
- Tính `pageCount`/`safePage`/`pagedRanking` và truyền `pagedRanking` vào `RankingTable`.
- Thêm `<select aria-label="Số dòng mỗi trang">` (20/50), nút "Trang trước"/"Trang sau", nhãn "Trang X/Y" + "Hiển thị X–Y / Z học viên".
- Thêm test slice-24 trong `ReportsPage.test.tsx`: 25 dòng → 20/trang, sang trang, đổi 50/trang, search giữ filter + reset trang.
- Lưu ý nợ kỹ thuật: khi ranking vượt `REPORT_ROW_LIMIT` (5000) cần phân trang phía server — xem TODO(slice-24) ở `apps/api/src/features/reports/routes.ts`.
- Cổng gác: web typecheck + lint + test (3 test) ĐÃ XANH.

**Đang làm dở**
- (không)

**Bước tiếp theo**
- Commit + push, chuyển slice-24 sang Review.

## Bàn giao phiên (điền khi dừng giữa chừng, dùng mẫu docs/ai-workflow/templates/session-handoff.md)
