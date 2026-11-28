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

### 2026-11-27 — slice-23-c (ADR 0022): mã học viên có dấu phân cách

**Đã xong**
- Dải cảnh báo ở `PreviewTable` sửa ví dụ định dạng từ `HN0001` sang `HN-0001`. Đây là chữ người dùng đọc, nên nó phải khớp mã thật — để nguyên là dạy người ta gõ một mã không tồn tại.
- Không đổi logic: import điểm vẫn khớp theo chuỗi nguyên vẹn; `student_code_looks_like_phone` vẫn bắt đúng (mã mới bỏ dấu `-` ra vẫn không giống SĐT).

**Bước tiếp theo**
- Cột mã trong file Excel giờ có `-`; nhập tay/dán có thể thành `HV - 0001`. Chưa chuẩn hoá đầu vào (ADR 0022 §Consequences).

### 2026-11-27 — ADR 0019: bỏ fallback SĐT, cảnh báo "cột mã là SĐT"

**Đã xong**
- Bỏ dải cảnh báo `matchedBy === 'phone'` và nhãn `· khớp SĐT` (hợp đồng đã bỏ hai trường đó — không còn fallback để báo).
- `PreviewTable` thêm dải cảnh báo `role="status"` khi có dòng `reason === 'student_code_looks_like_phone'`: nói rõ cột mã đang là SĐT, phải đổi sang mã học viên (dạng `HN0001`) rồi xem trước lại.
- `SKIP_REASON_LABELS`: `student_not_found` → "Không tìm thấy học viên theo mã" (bỏ "(mã/SĐT)" vì SĐT không còn là khoá); thêm `student_code_looks_like_phone` → "Cột mã đang là số điện thoại — cần đổi sang mã học viên".
- Test: ca cũ "khớp SĐT thì cảnh báo" đổi thành ca ADR 0019 — preview trả `applicable: 0`, thấy cảnh báo + nhãn lý do, nút xác nhận **bị khoá**, không gọi `/grading/import`.

**Ghi chú thiết kế**
- Cảnh báo dùng `role="status"` (không `alert`) vì không chặn thao tác — nhưng ở đây nút xác nhận đã bị khoá do `applicable === 0`, nên người dùng không thể bỏ qua cảnh báo rồi vẫn nhập.

**Bước tiếp theo**
- Khi trung tâm đã chuẩn hoá file, có thể bỏ dải cảnh báo này; lý do bỏ qua thì nên giữ vì nó là chẩn đoán.

### 2026-11-27 — slice-23 hướng an toàn: hiện cảnh báo khi khớp bằng SĐT

**Đã xong**
- `PreviewTable` nhận `matchedBy`: dòng nào khớp bằng SĐT thay vì mã học viên được gắn nhãn `· khớp SĐT` ngay cạnh mã, cộng một dải cảnh báo `role="status"` phía trên bảng tóm tắt số dòng phải dựa vào SĐT.
- `ImportResultSummary` hiện cảnh báo SAU khi nhập, liệt kê số dòng đã áp nhờ khớp SĐT (`GradeImportResult.matchedByPhone`). Nhờ vậy admin thấy ngay dữ liệu nào cần chuẩn hoá mã, thay vì im lặng tin vào SĐT.
- Không đổi luồng thao tác: vẫn Xem trước → Xác nhận; file Excel cũ không có cột mã vẫn nhập được.
- Test: `GradingPage.test.tsx` thêm ca preview có `matchedBy='phone'` → thấy cảnh báo; ca commit trả `matchedByPhone` → thấy cảnh báo sau nhập.

**Ghi chú thiết kế**
- Cảnh báo đặt trong `role="status"` (không phải `alert`) vì đây là thông tin bổ sung, không chặn thao tác — người dùng screen-reader vẫn được đọc nhưng không bị ngắt lời.

**Bước tiếp theo**
- Khi API gỡ hẳn fallback SĐT (chờ xác nhận 100% học viên có mã), xoá nhánh `matchedBy === 'phone'` ở đây cùng lúc.

## Bàn giao phiên

Điền theo mẫu `../../ai-workflow/templates/session-handoff.md` khi dừng giữa chừng.
