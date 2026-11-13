# Slice 21 — Liên kết Đề thi ↔ Bộ đề (UI)

- Cơ chế: Dọc
- Owner hiện tại: Hoang Hoang HA
- Nhánh: `feature/slice-21-lien-ket-de-bo-de`
- PR: —
- Trạng thái: xem `../MVP-BACKLOG.md` (nguồn trạng thái duy nhất)
- Phụ thuộc: slice-20
- Sửa mục gốc: —

## Cảnh báo tích hợp (làm sớm)

slice-20 mới ở trạng thái **Review** (chưa merge `dev`). Owner chủ động chấp nhận rủi ro, làm slice-21 sớm. Nhánh `feature/slice-21-lien-ket-de-bo-de` được tạo **từ `feature/slice-20-bo-de-de-thi-ui`**, không phải từ `dev`. Khi slice-20 merge vào `dev`, phải rebase slice-21 lên `dev` mới và chạy lại cổng gác trước khi mở PR.

## Mục tiêu bấm được / nghiệm thu được (mục 4.4)

Giữ nguyên mô hình "bộ đề = tập câu hỏi có thứ tự" từ slice-11a (bảng `exam_set_items`, API `PUT /api/exam-sets/:id/items`, `POST /api/exam-sets/:id/questions`). KHÔNG đổi API/contract — đây là slice UI.

- Admin/Teacher mở một bộ đề (status `draft`) → thấy **panel liên kết câu hỏi** hai phía: (trái) ngân hàng câu hỏi cùng cấp độ/kỹ năng với bộ đề, có tìm/lọc; (phải) danh sách câu đang thuộc bộ đề theo thứ tự.
- **Đưa vào:** chọn câu ở ngân hàng → bấm "Thêm vào bộ đề" → câu xuất hiện ở danh sách bộ đề (gọi `PUT /items` với danh sách mới).
- **Đưa ra:** bấm "Bỏ khỏi bộ đề" trên một câu trong danh sách → câu rời bộ đề (gọi `PUT /items`).
- **Sắp thứ tự:** nút lên/xuống đổi vị trí câu trong bộ đề (tái dùng cơ chế thứ tự đã có của ExamSetsPage nếu sẵn có).
- **Xem trước bộ đề:** nút "Xem trước" mở panel chỉ-đọc liệt kê các câu theo thứ tự (chỉ admin/teacher; không lộ ra phía học viên ngoài cửa sổ thi — không thêm API mới).
- Bộ đề `published`/`archived`: panel ở chế độ chỉ-đọc (không cho sửa items), đúng ràng buộc bất biến của slice-11a.

## Task

| # | Task | Tầng | Ghi chú |
| --- | --- | --- | --- |
| 1 | **Khảo sát UI/API hiện có.** Đọc `apps/web/src/features/examsets/ExamSetsPage.tsx`, `useExamSets.ts`, `apps/web/src/features/questions/useQuestions.ts`, `apps/web/src/lib/api.ts` (exam-set fns) để xác định phần đã có (trình soạn, `replaceExamSetItems`, `addExamSetQuestion`) và khoảng trống UI của 4.4. Không làm trùng. | FE | API đã đủ từ slice-11a. |
| 2 | **Panel liên kết câu hỏi vào/ra bộ đề.** Component mới (vd `ExamSetLinkPanel.tsx`) trong `features/examsets/`: cột ngân hàng (dùng `useQuestions` lọc theo level/skill của bộ đề) + cột bộ đề; thêm/bỏ/sắp thứ tự → gọi `replaceExamSetItems(setId, questionIds)` (giữ thứ tự). Chỉ bật khi bộ đề `draft`. | FE | Giữ mô hình tập câu hỏi; không thêm field contract. |
| 3 | **Xem trước bộ đề (chỉ-đọc).** Component `ExamSetPreview.tsx`: liệt kê câu theo thứ tự (text + loại), chỉ admin/teacher; không lộ sang luồng học viên. Nút "Xem trước" trên mỗi bộ đề. | FE | Không stub phân quyền/đáp án. |
| 4 | **Test.** vitest + testing-library: thêm câu từ ngân hàng → gọi `PUT /items` đúng danh sách; bỏ câu → danh sách mới đúng; bộ đề published → panel chỉ-đọc; xem trước hiển thị đúng thứ tự. Giữ các test examsets hiện có xanh. | FE | Mirror `ExamSetsPage.test.tsx`. |

## Stub cho phép

- Sắp thứ tự có thể làm bằng nút lên/xuống (không cần kéo-thả) ở bản đầu.

## Không được stub

Xác thực, phân quyền (chỉ admin/teacher sửa; `published` bất biến), không lộ đáp án/nội dung bộ đề sang phía học viên ngoài cửa sổ thi.

## Nợ kỹ thuật

| Marker | Vị trí | Nội dung | Dự kiến trả |
| --- | --- | --- | --- |
| `TODO(slice-21)` | ExamSetLinkPanel | Kéo-thả sắp xếp thay nút lên/xuống | Khi cần UX tốt hơn |

## Nhật ký thay đổi phạm vi của riêng Slice/Task này

| Ngày | Loại | Nội dung | Lý do | ADR |
| --- | --- | --- | --- | --- |
| 2026-11-13 | Tạo | Tạo file chi tiết slice-21, nhận việc (làm sớm trên nhánh slice-20) | Bắt đầu slice-21 | — |

## Cách nghiệm thu

1. Đăng nhập Admin/Teacher, mở một bộ đề `draft`.
2. Thêm vài câu từ ngân hàng vào bộ đề, bỏ bớt, đổi thứ tự → lưu đúng (danh sách câu + thứ tự cập nhật).
3. Mở "Xem trước" → thấy đúng danh sách câu theo thứ tự, không có luồng vào thi.
4. Mở một bộ đề `published` → panel chỉ-đọc, không cho sửa items.
5. Cổng gác: `pnpm -w lint`, `pnpm -w typecheck`, test examsets xanh.

## Bàn giao phiên gần nhất

Chưa có — điền theo mẫu `../../ai-workflow/templates/session-handoff.md` khi dừng giữa chừng.
