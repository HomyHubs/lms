# AGENTS.md — api/reports (Báo cáo học viên & xếp loại)

Nhật ký này thuộc riêng feature/nhánh này. Cập nhật liên tục, tối thiểu mỗi ngày làm việc, ngay cả khi task chưa xong. Đây là nơi nhiều dev làm song song mà không đụng file nhau.

## Bối cảnh feature

- Nhiệm vụ: API báo cáo học viên (`/reports/students`), chính sách xếp loại và tổng hợp xếp hạng.
- Slice/Task đang triển khai: slice-24, xem `docs/tasks/slices/slice-24-bao-cao-thi-xep-loai.md`
- Phụ thuộc module nào, qua cửa công khai nào: `@lms/shared` (`StudentReport`); feature `examhistory` (dùng chung scope/aggregation).
- Owner hiện tại: Hoang Hoang HA
- Nhánh: feature/slice-24-bao-cao-thi-xep-loai

## Contract (cửa công khai — chốt trước, không đổi giữa chừng)

- `routes.ts`: `/reports/students`, `/reports/classification-policies` — không đổi chữ ký trong slice-24.

## Nhật ký liên tục (thêm mục mới mỗi ngày, không ghi đè mục cũ)

### 2026-11-14

**Đã xong**
- Thêm `TODO(slice-24)` trên `/reports/students`: cần phân trang phía server cho ranking khi vượt `REPORT_ROW_LIMIT` (5000); hiện UI phân trang phía client (20/50) là đủ cho MVP.
- Cập nhật `routes.test.ts`: `HistoryAttemptRow` literal có branch/class; thêm `rowFailed`; fake store trả `listScopedAttempts`/`listScopedAttemptsPage`; thêm test đạt/rớt theo cơ sở/lớp/cấp độ + phân trang + 404/400.
- Cập nhật `store.integration.test.ts`: thu hẹp call site `loadExamAttemptReport` theo `ExamAttemptReportOutcome`.
- Cổng gác: api typecheck + lint + test ĐÃ XANH (service 4, routes 5; integration skip vì cần DB).

**Đang làm dở**
- (không)

**Bước tiếp theo**
- Commit + push, chuyển slice-24 sang Review; sau MVP xử lý nợ phân trang server cho ranking.

## Bàn giao phiên (điền khi dừng giữa chừng, dùng mẫu docs/ai-workflow/templates/session-handoff.md)
