# AGENTS.md — web/examhistory (Báo cáo thi & lịch sử làm bài)

Nhật ký này thuộc riêng feature/nhánh này. Cập nhật liên tục, tối thiểu mỗi ngày làm việc, ngay cả khi task chưa xong. Đây là nơi nhiều dev làm song song mà không đụng file nhau.

## Bối cảnh feature

- Nhiệm vụ: UI lịch sử làm bài (`ExamHistoryPage`) và trang báo cáo thi (`ExamReportsPage`) — bảng chi tiết lượt thi + dashboard đạt/rớt.
- Slice/Task đang triển khai: slice-24, xem `docs/tasks/slices/slice-24-bao-cao-thi-xep-loai.md`
- Phụ thuộc module nào, qua cửa công khai nào: `@lms/shared` (`ExamAttemptReport`, `ExamAttemptReportQuery`, `ExamPassFailGroup`); API `GET /api/reports/exam-attempts` (phân trang bằng `cursor`/`nextCursor`).
- Owner hiện tại: Hoang Hoang HA
- Nhánh: feature/slice-24-bao-cao-thi-xep-loai

## Contract (cửa công khai — chốt trước, không đổi giữa chừng)

- `useExamHistory.ts`: `useExamAttemptReport(query: Omit<ExamAttemptReportQuery, 'cursor'>)` — dùng `useInfiniteQuery`, `getNextPageParam = last.nextCursor ?? undefined`.
- `ExamReportsPage.tsx`: component trang báo cáo thi (default export qua route).

## Nhật ký liên tục (thêm mục mới mỗi ngày, không ghi đè mục cũ)

### 2026-11-14

**Đã xong**
- Chuyển `useExamAttemptReport` sang `useInfiniteQuery`; ghép các trang `pages.flatMap(p => p.attempts)`.
- Thêm `PassFailPanel` (thanh xếp chồng đạt/rớt) + 3 panel theo cơ sở/lớp/cấp độ, mỗi panel có `aria-label` (role region) để test tìm được.
- Thêm nút "Tải thêm" dùng `fetchNextPage()` khi `hasNextPage`.
- Cập nhật `ExamHistoryPage.test.tsx`: literal `ExamAttemptReport` có `byBranch/byClass/byLevel` + `nextCursor: null`; assert dashboard + chuỗi đếm "1 đạt / 1 rớt / 2".
- Cổng gác: web typecheck + lint + test (2 file, 5 test) ĐÃ XANH.

**Đang làm dở**
- (không)

**Bước tiếp theo**
- Commit + push, chuyển slice-24 sang Review.

## Bàn giao phiên (điền khi dừng giữa chừng, dùng mẫu docs/ai-workflow/templates/session-handoff.md)
