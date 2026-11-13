# Slice 20 — Bộ đề & Đề thi (UI)

- Cơ chế: Dọc
- Owner hiện tại: Hoang Hoang HA
- Nhánh: `feature/slice-20-bo-de-de-thi-ui`
- PR: —
- Trạng thái: xem `../MVP-BACKLOG.md` (nguồn trạng thái duy nhất, không ghi trùng ở đây để tránh lệch)
- Phụ thuộc: slice-4, slice-11a
- Sửa mục gốc: —

## Mục tiêu bấm được / nghiệm thu được

Các mục yêu cầu (mục 4): 4.1, 4.2, 4.3, 4.5. (Mục 4.4 — liên kết Đề thi ↔ Bộ đề — tách sang slice-21.)

- **4.1 Bố cục lại panel "Tạo đề":** Admin/Teacher mở trang Bài thi thấy panel "Tạo đề thi" (`BlueprintForm`) được bố cục lại thành các nhóm trường rõ ràng (Thông tin chung · Lịch mở/đóng · Ngưỡng & thi lại · Nguồn câu hỏi), lưới nhiều cột trên màn rộng, không còn một cột dọc dài khó đọc. Toàn bộ trường cũ giữ nguyên tên `name`/validation (không đổi contract `CreateExamRequest`).
- **4.2 Filter danh sách đề:** Trên danh sách đề của trang Bài thi có bộ lọc theo Cấp độ (starter/mover/flyer), Kỹ năng (listening/speaking/reading/writing), Chế độ (random/fixed_set) và ô tìm theo tên. Lọc phía client trên kết quả `listExams()`; hiển thị số lượng kết quả và trạng thái rỗng khi không khớp.
- **4.3 Xem trước đề:** Admin/Teacher bấm "Xem trước" trên một đề → mở panel/dialog chỉ-đọc hiển thị metadata đề (cấp độ, kỹ năng, số câu, thời lượng, cửa sổ mở/đóng, ngưỡng đạt, số lần thi, chế độ) và — với `fixed_set` — danh sách bộ đề liên kết kèm số câu (qua `getExamSet`). Không tạo lượt thi, không lộ đáp án.
- **4.5 Mẫu Excel import:** Nút "Tải mẫu Excel" tải về file `.xlsx` mẫu (header + 1 dòng ví dụ) cho luồng import đề/câu hỏi, dựng phía client bằng `@/lib/xlsx-export` (ADR 0006), không cần endpoint.

## Task

| # | Task | Tầng | Ghi chú |
| --- | --- | --- | --- |
| 1 | **4.1 Bố cục lại `BlueprintForm`.** Gom các trường trong `apps/web/src/features/exams/BlueprintForm.tsx` thành các nhóm có tiêu đề + lưới `sm:grid-cols-2` / `lg:grid-cols-3`, giữ nguyên `name`, validation và logic lớp/level/fixed_set. | FE | Không đổi `CreateExamRequest` (contract slice-4/11a). |
| 2 | **4.2 Filter danh sách đề.** Thêm thanh lọc (cấp độ · kỹ năng · chế độ · tìm theo tên) vào danh sách đề của `apps/web/src/features/exams/ExamsPage.tsx`; lọc client trên `useExams()`; hiển thị số kết quả + trạng thái rỗng khi lọc không khớp. | FE | `listExams()` không nhận tham số lọc → lọc client. Dùng enum `LevelCode`, `QUESTION_SKILLS`, `ExamMode` từ `@lms/shared`. |
| 3 | **4.3 Xem trước đề.** Thành phần `ExamPreview` chỉ-đọc (dialog/panel) hiển thị metadata đề; với `fixed_set` gọi `getExamSet` cho từng `examSetIds` để hiện tên + số câu. Nút "Xem trước" trên mỗi thẻ đề (chỉ hiện với manager). | FE | Không tạo attempt, không lộ đáp án (không stub phân quyền/đáp án). |
| 4 | **4.5 Mẫu Excel import.** Hàm dựng workbook mẫu (`exam-import-template.ts`) + nút "Tải mẫu Excel" dùng `buildXlsx`/`downloadFile`/`XLSX_MIME` từ `@/lib/xlsx-export`. Header khớp cột import đề/câu hỏi hiện có + 1 dòng ví dụ. | FE | Tái dùng định dạng của slice-11b/11c; đối chiếu `lib/question-import.ts` để header khớp parser. |

## Stub cho phép

- Xem trước đề (Task 3) dùng lại `getExamSet` lặp theo từng `examSetIds`; nếu chậm khi nhiều bộ, gom thành một endpoint batch ở slice sau (đánh dấu `TODO(slice-20)`).

## Không được stub

Xác thực, phân quyền (nút quản lý chỉ hiện với admin/teacher đúng như hiện tại), hạn mức, chuỗi hiển thị đa ngôn ngữ. Không lộ đáp án trong màn xem trước.

## Nợ kỹ thuật

| Marker | Vị trí | Nội dung | Dự kiến trả |
| --- | --- | --- | --- |
| `TODO(slice-20)` | `ExamPreview` | Lặp `getExamSet` theo từng bộ — gom endpoint batch nếu chậm | Khi số bộ liên kết lớn |

## Nhật ký thay đổi phạm vi của riêng Slice/Task này

| Ngày | Loại | Nội dung | Lý do | ADR |
| --- | --- | --- | --- | --- |
| 2026-11-13 | Tạo | Tạo file chi tiết slice-20, nhận việc | Bắt đầu slice-20 | — |

## Cách nghiệm thu

1. Đăng nhập bằng tài khoản Admin/Teacher, mở trang Bài thi.
2. Panel "Tạo đề thi" hiển thị theo nhóm trường + lưới nhiều cột; tạo một đề `random` và một đề `fixed_set` vẫn thành công như trước.
3. Dùng bộ lọc cấp độ/kỹ năng/chế độ + ô tìm tên: danh sách thu hẹp đúng, số kết quả cập nhật, lọc không khớp hiện trạng thái rỗng.
4. Bấm "Xem trước" trên một đề `fixed_set`: thấy metadata + danh sách bộ đề liên kết kèm số câu; không có nút vào thi, không lộ đáp án.
5. Bấm "Tải mẫu Excel": tải về `.xlsx` mở được, header khớp cột import, có 1 dòng ví dụ.
6. Cổng gác: `pnpm -w lint`, `pnpm -w typecheck`, test của feature exams/examsets xanh.

## Bàn giao phiên gần nhất

Chưa có — điền theo mẫu `../../ai-workflow/templates/session-handoff.md` khi dừng giữa chừng.
