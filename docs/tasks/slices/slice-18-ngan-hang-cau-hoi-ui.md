# Slice 18 — Ngân hàng câu hỏi (UI)

- Cơ chế: Dọc
- Owner hiện tại: —
- Nhánh: —
- PR: —
- Trạng thái: xem `../MVP-BACKLOG.md` (nguồn trạng thái duy nhất)
- Phụ thuộc: slice-3 (Done)
- Sửa mục gốc: —

## Mục tiêu bấm được / nghiệm thu được

- Trang "Ngân hàng câu hỏi" (`apps/web/src/features/questions/QuestionsPage.tsx`) có nút "Tải mẫu Excel" tải về file đúng 10 cột của Question Import Schema để user biết cột nào điền gì rồi làm theo.
- Mỗi cấp độ trong `LEVEL_CODES` (@lms/shared — Starter/Mover/Flyer) có một panel riêng; câu hỏi hiển thị trong panel của đúng cấp độ.
- Mỗi panel thu gọn/mở được; trong panel, mỗi cột của bảng có ô lọc riêng và bảng nằm ngay dưới hàng lọc.
- Bấm "Sửa" ở một câu sẽ cuộn lên form soạn và nạp sẵn nội dung câu đó; nút "Sửa" và "Xoá" nằm cùng một hàng, cỡ nhỏ (`size="sm"`).
- Trạng thái đóng/mở của từng panel được nhớ theo từng user (localStorage) và hiện đúng khi user đăng nhập lại — không đổi schema DB.

## Task

| # | Task | Tầng | Ghi chú |
| --- | --- | --- | --- |
| 1 | Nút "Tải mẫu Excel": dựng workbook 1 sheet, hàng đầu = `IMPORT_COLUMNS` (@lms/shared) + 1–2 hàng ví dụ, tải về bằng `buildXlsx` + `downloadFile` (`apps/web/src/lib/xlsx-export.ts`); đặt cạnh khối "Import từ CSV / XLSX" trong `QuestionsPage.tsx`. | FE | Tham chiếu cách slice-11c sinh mẫu bằng `scripts/make-import-fixtures.mjs`; hoặc đặt file tĩnh `public/templates/` như slice-11b/11c |
| 2 | Chia panel theo cấp độ: nhóm `questions.data` theo `levelCode`, render mỗi mã trong `LEVEL_CODES` thành một panel (component mới `LevelPanel` trong feature `questions`); câu của panel chỉ gồm câu cùng `levelCode`. | FE | Thay bảng phẳng hiện tại trong `QuestionsPage.tsx` |
| 3 | Panel thu gọn/mở: header panel bấm để đóng/mở phần thân; khi thu gọn vẫn giữ tiêu đề cấp độ + số câu. | FE | Yêu cầu 3.6 |
| 4 | Nhớ trạng thái đóng/mở theo user: tạo `apps/web/src/features/questions/panel-state.ts` lưu localStorage (key `questions:panels:<userId>`), lấy `userId` từ phiên (như `AppShell`); theo mẫu localStorage của `apps/web/src/features/exams/exam-draft.ts` (slice-4.3). | FE | CHỐT: lưu client, KHÔNG đổi schema (yêu cầu 3.7) |
| 5 | Lọc theo từng cột trong panel: chuyển state `filters` hiện có thành hàng ô lọc trên đầu các cột của bảng (bỏ cột Cấp độ vì panel đã cố định level; giữ lọc Kỹ năng/Độ khó/Loại + ô lọc văn bản cho cột Câu hỏi); bảng nằm ngay dưới hàng lọc. | FE | Yêu cầu 3.4 |
| 6 | "Sửa" cuộn lên form: thêm `ref` cho section "Thêm câu hỏi", trong `editQuestion()` gọi `ref.scrollIntoView`; giữ nút "Sửa" và "Xoá" cùng một `<td>` với `size="sm"`, gọn đẹp. | FE | Yêu cầu 3.3; form đã nằm trên bảng nên chỉ cần cuộn lên |
| 7 | Test UI: cập nhật `QuestionsPage.test.tsx` + `QuestionsPage.regression.test.tsx` cho panel theo level, đóng/mở nhớ qua localStorage, lọc theo cột, nút tải mẫu, cuộn lên khi bấm Sửa. | FE | Dùng hook thật như các test regression sẵn có |
| 8 | Không đổi backend: dùng lại `GET /questions` (`apps/api/src/features/questions/routes.ts`) và `IMPORT_COLUMNS` (`packages/shared/src/questions.ts`); 3.7 lưu client nên không thêm endpoint/migration. | API | Xác nhận không phát sinh thay đổi API/DB/Shared |

## Stub cho phép

- Vẫn lọc phía client trên danh sách đã tải (giữ như slice-3.1); chưa cần phân trang hay tải câu hỏi theo từng cấp độ từ server.
- Nút tải mẫu được phép dùng file tĩnh trong `public/templates/` thay cho sinh client-side nếu nhanh hơn.

## Không được stub

Xác thực, phân quyền, hạn mức, chuỗi hiển thị — trừ khi ghi khác trong ADR. Quyền sửa câu hỏi theo role do slice-19 enforce ở server; ở slice này việc ẩn/hiện nút trên UI không được coi là đủ để thay cho guard.

## Nợ kỹ thuật

| Marker | Vị trí | Nội dung | Dự kiến trả |
| --- | --- | --- | --- |
| NOTE | `apps/web/src/features/questions/panel-state.ts` | Trạng thái panel chỉ nhớ trên từng trình duyệt của user, không đồng bộ đa thiết bị | Mở slice lưu preference phía server nếu có nhu cầu |

## Nhật ký thay đổi phạm vi của riêng Slice/Task này

| Ngày | Loại | Nội dung | Lý do | ADR |
| --- | --- | --- | --- | --- |
| 2026-11-12 | Thêm | Tạo slice | Tách phần UI ngân hàng câu hỏi (3.1–3.4, 3.6, 3.7) khỏi slice-3 để làm riêng | — |

## Cách nghiệm thu

1. Mở trang "Ngân hàng câu hỏi", bấm "Tải mẫu Excel" → mở file thấy đúng 10 cột `IMPORT_COLUMNS`, điền theo rồi import lại thành công.
2. Thấy mỗi cấp độ (Starter/Mover/Flyer) là một panel riêng; câu hỏi nằm đúng panel theo cấp độ.
3. Thu gọn panel Mover, tải lại trang (đăng nhập lại cùng user) → panel Mover vẫn thu gọn; đăng nhập user khác → panel về trạng thái mặc định của user đó.
4. Trong một panel, lọc theo cột Kỹ năng/Độ khó/Loại và ô lọc văn bản câu hỏi → bảng dưới hàng lọc cập nhật đúng.
5. Bấm "Sửa" ở câu cuối bảng → trang cuộn lên form và nạp sẵn nội dung; nút Sửa/Xoá cùng hàng, cỡ nhỏ.
6. Cổng gác web `pnpm -r build && lint && typecheck && test` PASS, gồm test mới của `QuestionsPage`.

## Bàn giao phiên gần nhất
