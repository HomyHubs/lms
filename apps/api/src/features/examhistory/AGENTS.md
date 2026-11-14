# AGENTS.md — api/examhistory (Báo cáo thi & lịch sử làm bài)

Nhật ký này thuộc riêng feature/nhánh này. Cập nhật liên tục, tối thiểu mỗi ngày làm việc, ngay cả khi task chưa xong. Đây là nơi nhiều dev làm song song mà không đụng file nhau.

## Bối cảnh feature

- Nhiệm vụ: API lịch sử làm bài + báo cáo thi — tổng hợp đạt/rớt theo cơ sở/lớp/cấp độ và phân trang chi tiết lượt thi.
- Slice/Task đang triển khai: slice-24, xem `docs/tasks/slices/slice-24-bao-cao-thi-xep-loai.md`
- Phụ thuộc module nào, qua cửa công khai nào: `@lms/shared` (`ExamAttemptReport`, `ExamPassFailGroup`); DB qua `ExamHistoryStore`.
- Owner hiện tại: Hoang Hoang HA
- Nhánh: feature/slice-24-bao-cao-thi-xep-loai

## Contract (cửa công khai — chốt trước, không đổi giữa chừng)

- `service.ts`:
  - `loadExamAttemptReport(store, scope, query: { cursor? }, now): Promise<ExamAttemptReportOutcome>`
  - `ExamAttemptReportOutcome = { ok: true; report: ExamAttemptReport } | { ok: false; reason: 'bad_cursor' }`
- `ExamHistoryStore`: thêm `listScopedAttemptsPage(scope, before, limit)` bên cạnh `listScopedAttempts`.
- `HistoryAttemptRow`: thêm `branch_id/branch_name/class_id/class_name: string`.

## Nhật ký liên tục (thêm mục mới mỗi ngày, không ghi đè mục cũ)

### 2026-11-14

**Đã xong**
- `loadExamAttemptReport` trả `ExamAttemptReportOutcome`: giải mã cursor (sai → `bad_cursor`), lấy tập tổng hợp (cap `REPORT_ROW_LIMIT=5000`) + trang chi tiết (`HISTORY_PAGE_SIZE+1=51`), tính `byBranch/byClass/byLevel` qua `groupPassFail()`, trả `nextCursor`.
- `store.ts`: `selectScopedAttempts` join enrollments→classes→branches, `distinctOn('a.id')` để khử trùng học viên nhiều lớp rồi re-sort newest-first; thêm `listScopedAttemptsPage` bọc subquery để lọc cursor sau khi DISTINCT ON.
- `routes.ts`: `/reports/exam-attempts` đọc `cursor`, `!outcome.ok` → 400.
- Cổng gác: api typecheck + lint + test ĐÃ XANH (routes 5 test gồm case slice-24; integration skip vì cần DB).

**Đang làm dở**
- (không)

**Bước tiếp theo**
- Commit + push, chuyển slice-24 sang Review.

## Bàn giao phiên (điền khi dừng giữa chừng, dùng mẫu docs/ai-workflow/templates/session-handoff.md)
