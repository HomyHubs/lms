# AGENTS.md — web/grading (Chấm bài)

Nhật ký này thuộc riêng feature/nhánh này. Cập nhật liên tục, tối thiểu mỗi ngày làm việc.

## Bối cảnh feature

- Nhiệm vụ: màn Chấm bài (`GradingPage`) — hàng đợi chấm tay Speaking/Writing + nhập bảng điểm từ Excel/CSV.
- Slice/Task đang triển khai: slice-22, xem `docs/tasks/slices/slice-22-cham-bai.md` (nền từ slice-9a).
- Phụ thuộc: `@lms/shared` (`GradeImportPreview`, `GradeImportResult`, `ManualGradingAttempt`); API `/api/grading/*`; `@/features/exams/useExams`.
- Owner hiện tại: Hoang Hoang HA
- Nhánh: feature/slice-22-cham-bai

## Contract (cửa công khai)

- `GradingPage.tsx`: trang Chấm bài (default export qua route).
- `useGrading.ts`: `useGradingQueue`, `useGradingAttempt`, `useGradeAttempt`, `useImportGrades` (commit), `usePreviewGrades` (slice-22, dry-run).

## Nhật ký liên tục

### 2026-11-14 — slice-22

**Đã xong**
- `usePreviewGrades` + client `previewGradeImport` gọi `POST /grading/import/preview` (không ghi gì).
- `GradeImportCard` đổi sang luồng XEM TRƯỚC → XÁC NHẬN: bấm "Xem trước" hiện `PreviewTable` (dòng / mã / học viên / điểm / kết quả sẽ-nhập|lý-do bỏ qua); nút "Xác nhận đưa vào lớp (N)" khoá khi có lỗi định dạng hoặc `applicable === 0`; đổi kỳ thi/file thì reset preview.
- Link "Tải file mẫu" → `public/templates/mau-bang-diem.csv` (cột `ma_hoc_vien,diem,nhan_xet`).
- Giữ nguyên hàng đợi chấm tay + form chấm từng câu (slice-9a).
- Test: `GradingPage.test.tsx` thêm ca preview→confirm (preview không commit; confirm mới gọi `/grading/import`).

**Bước tiếp theo**
- PR slice-22 → dev.

## Bàn giao phiên

Điền theo mẫu `../../ai-workflow/templates/session-handoff.md` khi dừng giữa chừng.
