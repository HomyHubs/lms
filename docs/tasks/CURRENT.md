# Task hiện tại (chỉ dùng khi làm tuần tự một mình)

Phạm vi sử dụng: CHỈ áp dụng khi đúng một người hoặc một agent làm việc, không có ai khác chạy song song trên repo này. Ngay khi có dev/agent thứ hai bắt đầu làm song song, ngừng cập nhật file này và chuyển hẳn sang dùng `MVP-BACKLOG.md` (cột Owner) và `AGENTS.md` của từng feature.

## Đang làm

- ID Slice/Task: slice-3 (Ngân hàng câu hỏi theo cấp độ Starter/Mover/Flyer + import)
- Cập nhật ngày: 2026-09-20
- Mô tả phạm vi: Ngân hàng câu hỏi phân loại theo Level (Starter/Mover/Flyer) / Skill / Type / Difficulty; CRUD câu hỏi (Admin/Teacher, RBAC thật) + import hàng loạt theo Question Import Schema. Import validate strict (`.strict()`): sai/thừa field hoặc sai enum → báo lỗi rõ ràng và KHÔNG lưu gì (all-or-nothing). Chi tiết: `slices/slice-3-ngan-hang-cau-hoi.md`. Phụ thuộc: slice-1 (đã merge — commit `7e6dfc4`, PR #3).
- Nhánh làm việc: feature/slice-3-ngan-hang-cau-hoi (base = `dev`)
- Trạng thái: Đã hiện thực đủ các tầng (shared/api/web/db), cổng gác xanh cục bộ. CHƯA commit — đang chờ rà soát changeset trước khi commit/mở PR.

## Đã làm trong phiên gần nhất

- **`@lms/shared` — `questions.ts`:** contract Ngân hàng câu hỏi dùng chung FE-BE (`Question`, `CreateQuestionRequest`, `UpdateQuestionRequest`, Question Import Schema `QuestionImportRow` dùng `.strict()`, `ImportQuestionsRequest`/`ImportQuestionsResult`, `QuestionImportError`, danh sách cột `IMPORT_COLUMNS`). `LevelCode` (Starter/Mover/Flyer) tái dùng nguồn duy nhất ở `catalog.ts` (đã bỏ khai báo trùng từng gây lỗi build `TS2308` ở barrel `index.ts`). Export qua `index.ts`.
- **API — feature `questions/`:** `store.ts` (`makeQuestionsStore(db)`), `service.ts` (`listQuestions`/`createQuestion`/`updateQuestion`/`deleteQuestion`/`importQuestions` — import validate strict từng dòng, chỉ cần một dòng sai là trả lỗi rõ và KHÔNG lưu dòng nào), `routes.ts` (GET/POST `/questions`, PATCH/DELETE `/questions/:id`, POST `/questions/import`) với RBAC `requireRole('admin','teacher')`. Wiring trong `app.ts` (line 73). DB: `db/migrations/20260921000000_questions.sql` (bảng câu hỏi khoá theo Level).
- **Web — feature `questions/`:** trang `/questions` (`QuestionsPage`) — form thêm câu hỏi + import từ CSV + bảng danh sách; hook `useQuestions` (list/create/delete/import, TanStack Query); API client `listQuestions`/`createQuestion`/`updateQuestion`/`deleteQuestion`/`importQuestions` + `parseQuestionsCsv` (parse CSV, tách options theo `|`, đọc thông báo lỗi rõ từ backend). Route + guard trong `App.tsx` / `RequireAuth.tsx`.

## Đang làm dở / còn thiếu

- Chưa commit/push/mở PR (chờ người dùng xác nhận). §12.2: người/agent viết code KHÔNG được tự duyệt PR của mình — cần một identity độc lập review & approve.
- Nợ kỹ thuật kế thừa: chạy `dbmate migrate` + seed trên Postgres thật (migration `20260921000000_questions.sql` chưa chạy trên DB thật); cắm provider email thật cho OTP (TODO trong `email.ts`).

## Cổng gác đã chạy

- `pnpm build` (tsc toàn repo): 3/3 task xanh.
- `pnpm test` (turbo): shared 14 test, api 85 test, web 10 test — tất cả xanh.
- Nghiệm thu slice-3 được phủ test ở cả hai tầng: import đúng schema → thành công (service + route trả 201, `imported=1`, options tách theo `|`); import sai field/enum → báo lỗi rõ (400 + `errors`) và KHÔNG lưu dòng nào (`listQuestions` rỗng).

## Bước tiếp theo

1. Rà soát changeset, commit theo tầng, push nhánh & mở PR vào `dev`; chạy quy trình review (skill `claude-review-loop`) với identity độc lập (§12.2).
2. Sau khi review pass + merge: cập nhật `MVP-BACKLOG.md` (Done, điền PR) và bảng rollup ở `../../AGENTS.md`.
3. Chạy `dbmate migrate` + seed trên Postgres thật để kiểm tra migration slice-3 end-to-end.

## Bàn giao phiên (nếu dừng giữa chừng)

Điền theo mẫu `../ai-workflow/templates/session-handoff.md`.
