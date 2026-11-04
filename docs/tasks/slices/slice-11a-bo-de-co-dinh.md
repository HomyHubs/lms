# Slice/Task slice-11a — Bộ đề thi cố định (tạo trên hệ thống) & thi theo bộ đề

- Cơ chế: Dọc
- Owner hiện tại: ...
- Nhánh: `feature/slice-11a-bo-de-co-dinh`
- PR: ...
- Trạng thái: xem `../MVP-BACKLOG.md`
- Phụ thuộc: slice-4, slice-5 (Done)
- Sửa mục gốc: để trống (tính năng mới; mở rộng slice-4 bằng mode mới, không sửa hành vi random hiện có)

## Hiện trạng (khảo sát origin/dev `eabca4f`, 2026-11-05)

- Đề thi hiện chỉ là *blueprint random*: `CreateExamRequest` = level + skill + `questionCount` → mỗi lượt rút ngẫu nhiên từ ngân hàng (`packages/shared/src/exams.ts`, `apps/api/src/features/exams/service.ts`).
- KHÔNG có "bộ đề" cố định: không chọn tay câu hỏi, không có thứ tự câu, không có khái niệm đề nháp/đã phát hành.
- Học viên login (slice-0), làm bài, checkpoint, nộp, chấm, thi lại đã có (slice-4/4.1/5). Snapshot câu hỏi + đáp án đóng băng khi bắt đầu lượt (ADR-0002) — slice này PHẢI tái dùng, không viết luồng chấm mới.

## Mục tiêu bấm được / nghiệm thu được

Admin/Giáo viên tạo một bộ đề trắc nghiệm trên hệ thống (chọn câu từ ngân hàng hoặc soạn câu mới ngay trong bộ đề, sắp xếp thứ tự), phát hành bộ đề, tạo kỳ thi từ bộ đề; học viên login, thấy kỳ thi, làm đúng các câu của bộ đề, nộp bài và được chấm tự động như đề random.

## Task

| # | Task | Tầng | Ghi chú |
| --- | --- | --- | --- |
| 1 | **Contract + migration + ADR-0009.** Bảng `exam_sets` (id, title, level_id, skill, description, status `draft`\|`published`\|`archived`, created_by, created_at, updated_at, published_at) và `exam_set_items` (exam_set_id, position int, question_id → `questions`, points_override null; unique (exam_set_id, position) và (exam_set_id, question_id)). `exams` thêm `mode` (`random`\|`fixed_set`, default `random`) + `exam_set_id` null (check: `fixed_set` ⇔ có `exam_set_id`; `question_count` = số item khi fixed) + cờ `shuffle_questions`, `shuffle_options`. `questions.source` thêm giá trị `exam_set`. Zod trong `packages/shared/src/exam-sets.ts` + mở rộng `CreateExamRequest` dạng discriminated union theo `mode`. Migration additive, có `migrate:down`. | - | ADR-0009 ghi chính sách thi lại của đề cố định (xem mục Mở) |
| 2 | **API bộ đề** (feature mới `apps/api/src/features/examsets/`, RBAC `requireManager`): `GET/POST /api/exam-sets`, `GET/PATCH/DELETE /api/exam-sets/:id` (chỉ khi `draft`), `PUT /api/exam-sets/:id/items` (thay toàn bộ danh sách có thứ tự, 1 transaction), `POST /api/exam-sets/:id/questions` (soạn câu mới → tạo row `questions` source=`exam_set` + item), `POST /api/exam-sets/:id/publish` (validate: ≥1 câu; mọi câu trắc nghiệm có ≥2 options và `correct_answer` khớp 1 option; cùng level/skill với bộ đề), `POST /api/exam-sets/:id/archive`, `POST /api/exam-sets/:id/duplicate`. Bộ đề `published` bất biến (check service + trigger DB). | - | Unit + route test + integration PG18 theo mẫu `exams/store.integration.test.ts` |
| 3 | **Thi theo bộ đề:** `POST /api/exams` với `mode=fixed_set` chỉ nhận bộ đề `published`. `startAttempt` nhánh fixed: paper = item theo `position` (xáo nếu bật cờ), tạo snapshot đúng định dạng ADR-0002 để `gradeAttempt` slice-5 chạy không đổi. Thi lại theo ADR-0009. `ExamQuestionView` vẫn không lộ đáp án. | - | Regression: mode random không đổi hành vi (toàn bộ test slice-4/5 xanh) |
| 4 | **UI quản lý bộ đề** (`apps/web/src/features/examsets/`): danh sách + lọc level/skill/status; trình soạn: thêm câu từ ngân hàng (tìm/lọc), soạn câu mới inline (tái dùng form câu hỏi của `QuestionsPage`), kéo-thả sắp thứ tự, xem trước dạng học viên, nút Phát hành/Nhân bản/Lưu trữ. `BlueprintForm` thêm chọn mode "Ngẫu nhiên từ ngân hàng" / "Theo bộ đề". Menu theo role trong AppShell (slice-10). | - | Component test theo mẫu `BlueprintForm.test.tsx` |

## Stub cho phép

- Trình soạn chỉ hỗ trợ soạn mới `multiple_choice` và `true_false`; `fill_blank`/`matching` thêm từ ngân hàng thì hiển thị read-only — TODO(slice-11a-ext).
- Hình ảnh: để slice-12 (trình soạn chừa nút "Chèn hình" disabled).

## Không được stub

Xác thực, RBAC (học viên không gọi được API bộ đề), bất biến bộ đề đã phát hành, snapshot khi bắt đầu lượt, không lộ đáp án cho học viên, migration đảo ngược được.

## Nợ kỹ thuật

| Marker | Vị trí | Nội dung | Dự kiến trả |
| --- | --- | --- | --- |
| TODO(slice-12) | Trình soạn bộ đề | Nút chèn hình | slice-12 |

## Mở — owner chốt trước khi code Task 1

1. Thi lại đề cố định: (a) cùng bộ câu, xáo thứ tự câu + đáp án; (b) gán ≥2 bộ đề tương đương cho một kỳ thi, lượt sau lấy bộ khác. Quy tắc slice-4 "không sinh 2 đề giống nhau liên tiếp" chỉ giữ được với (b). Đề xuất: hỗ trợ cả hai, mặc định (a), ghi trong ADR-0009.
2. Kỳ thi hiện chưa gán theo lớp/chi nhánh — học viên nào cũng thấy đề đang mở. Có cần gán `class_id`/`branch_id` cho exam trong slice này không? (Nếu có: thêm Task 5 hoặc slice riêng.)

## Nhật ký thay đổi phạm vi của riêng Slice/Task này

| Ngày | Loại | Nội dung | Lý do | ADR |
| --- | --- | --- | --- | --- |
| 2026-11-05 | Thêm | Tạo slice | Yêu cầu bộ đề cố định tạo trên hệ thống | 0009 (sẽ viết ở Task 1) |

## Cách nghiệm thu

1. Giáo viên tạo bộ đề Starter/Reading 10 câu (5 từ ngân hàng, 5 soạn mới), sắp thứ tự, phát hành; thử sửa bộ đề đã phát hành → bị chặn.
2. Tạo kỳ thi mode "Theo bộ đề"; học viên login, làm bài, thấy đúng 10 câu, response mạng không chứa đáp án; nộp → có điểm, đạt/không đạt.
3. Thi trượt → thi lại theo chính sách ADR-0009.
4. Toàn bộ test slice-4/5 vẫn xanh; build/lint/typecheck/test + integration PG18 PASS.

## Bàn giao phiên gần nhất

Điền theo mẫu `../../ai-workflow/templates/session-handoff.md` khi dừng giữa chừng.
