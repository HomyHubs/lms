# Slice/Task slice-13 — Lịch sử thi của học viên & báo cáo kết quả/thi lại

- Cơ chế: Dọc
- Owner hiện tại: ...
- Nhánh: `feature/slice-13-lich-su-thi-bao-cao`
- PR: ...
- Trạng thái: xem `../MVP-BACKLOG.md`
- Phụ thuộc: slice-5, slice-7 (Done). Nên merge sau slice-11a để có cột mode/bộ đề (không bắt buộc — thiếu thì cột để trống).
- Sửa mục gốc: để trống

## Hiện trạng (origin/dev `eabca4f`)

- Đã có: `exam_attempts` lưu `attempt_number`, `started_at`, `deadline_at`, `submitted_at`, điểm/đạt (slice-5); API `GET /api/exams/:id/history` (học viên, 1 đề) và `GET /api/exams/:id/results` (manager, 1 đề) — `apps/api/src/features/exams/routes.ts`.
- CHƯA có: màn hình web nào gọi 2 API trên; lịch sử xuyên mọi đề của một học viên; báo cáo số lần thi lại; xuất file; lý do nộp (tự nộp / hết giờ tự nộp).
- Rủi ro mất lịch sử: `exam_attempts.exam_id ... on delete cascade` (`db/migrations/20260921010000_exams.sql`) — xoá đề là xoá luôn lịch sử thi.

## Mục tiêu bấm được / nghiệm thu được

Học viên xem "Lịch sử thi" của mình (mọi đề, mọi lần thi, ngày giờ bắt đầu/nộp, điểm, đạt/không, lần thứ mấy). Admin/Giáo viên xem lịch sử của từng học viên và báo cáo tổng hợp theo đề/lớp/khoảng ngày (số lượt, số lần thi lại, tỉ lệ đạt), xuất Excel/CSV.

## Task

| # | Task | Tầng | Ghi chú |
| --- | --- | --- | --- |
| 1 | **Bảo toàn lịch sử (migration).** Đổi FK `exam_attempts.exam_id` sang `on delete restrict`; nếu cần ẩn đề thì dùng `archived_at`. Thêm `exam_attempts.submit_reason` (`manual`\|`deadline_auto`\|`late_checkpoint`) ghi tại điểm finalize hiện có (slice-4.1), dữ liệu cũ để `null`. Thêm index `(student_id, started_at desc)`. Migration đảo ngược được. | - | Không đổi logic chấm/thi lại |
| 2 | **API lịch sử.** `GET /api/me/exam-attempts` (học viên) và `GET /api/students/:id/exam-attempts` (manager, giới hạn theo chi nhánh/lớp được phân quyền slice-1). Filter `from`, `to` (theo `started_at`), `examId`, `level`, `passed`; phân trang cursor. Mỗi dòng: examTitle, mode/bộ đề (nếu có), attemptNumber, startedAt, submittedAt, thời gian làm (giây), submitReason, score, maxScore, percent, passed, status. DB lưu `timestamptz`, API trả ISO UTC; FE hiển thị giờ `Asia/Ho_Chi_Minh`. | - | Contract `packages/shared/src/exam-history.ts` |
| 3 | **API báo cáo + xuất file.** `GET /api/reports/exam-attempts` (admin/manager): gom theo đề hoặc theo học viên trong khoảng ngày + lớp/chi nhánh: số học viên dự thi, tổng lượt, số lượt thi lại (attempt_number > 1), số học viên đạt ngay lần 1, tỉ lệ đạt cuối, điểm TB/cao nhất. Xuất `.xlsx`/`.csv` qua `apps/web/src/features/reports/report-export.ts` (slice-7), có sheet chi tiết từng lượt kèm ngày giờ. | - | Integration PG18 với dữ liệu nhiều lượt |
| 4 | **UI.** (a) Học viên: trang "Lịch sử thi" (bảng + lọc ngày, badge Đạt/Không đạt, "Lần 2/3"), link từ dashboard học viên (slice-10). (b) Manager: tab "Lịch sử thi" trong chi tiết học viên + trang "Báo cáo thi" (bộ lọc, bảng tổng hợp, nút Xuất Excel/CSV). Không hiện đúng/sai từng câu cho học viên (giữ quyết định slice-5). | - | Component test theo mẫu `ReportsPage.test.tsx` |

## Stub cho phép

Biểu đồ xu hướng điểm theo thời gian — để sau.

## Không được stub

RBAC theo chi nhánh/lớp, không xoá được lịch sử, ngày giờ lấy từ server (không nhận giờ client), số lần thi lại tính từ dữ liệu thật.

## Nợ kỹ thuật

| Marker | Vị trí | Nội dung | Dự kiến trả |
| --- | --- | --- | --- |

## Nhật ký thay đổi phạm vi của riêng Slice/Task này

| Ngày | Loại | Nội dung | Lý do | ADR |
| --- | --- | --- | --- | --- |
| 2026-11-05 | Thêm | Tạo slice | Yêu cầu lịch sử kết quả + số lần thi lại + ngày giờ để report | — |

## Cách nghiệm thu

1. Học viên thi đề A 2 lần (trượt rồi đạt), đề B 1 lần (để hết giờ) → "Lịch sử thi" có 3 dòng đúng ngày giờ, lần thứ, điểm, lý do nộp "Hết giờ" cho đề B.
2. Admin lọc theo khoảng ngày → báo cáo đề A: 1 lượt thi lại, đạt lần 1 = 0%, đạt cuối = 100%; file Excel xuất ra khớp số liệu.
3. Giáo viên chi nhánh khác không xem được lịch sử học viên này (403).
4. Xoá đề đã có lượt thi ở DB → bị FK chặn.
5. Gates + integration PG18 PASS.

## Bàn giao phiên gần nhất

Điền theo mẫu `../../ai-workflow/templates/session-handoff.md` khi dừng giữa chừng.
