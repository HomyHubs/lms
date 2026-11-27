# AGENTS.md — Exams API

## Bối cảnh feature

- Slice-4 owner: An Vo, PR #6, `feature/slice-4-tao-de-thi-online`.
- Independent local follow-up: `bugfix/slice-4.1-exam-integrity`, base `0766ee749230328e6bf7b9165984d0561f4e9dd5`. No owner-branch push or merge authorized.
- Public dependencies: auth/index.js for session hashing; access/index.js for RBAC; @lms/shared for contracts; platform/db for Kysely.
- Contract: index.ts exports service/store/routes; added saveAttemptAnswers and variantKey. See docs/adr/0002-exam-attempt-integrity.md before changing integrity rules.

## Nhật ký liên tục

### 2026-11-03 — Independent integrity follow-up

**Đã xong**
- Non-repeating paper generation fails explicitly when no unique paper exists, deduplicates exact content variants and compares previous immutable content.
- Ordered immutable question/grading snapshots; student responses explicitly project safe fields.
- Authenticated session lease; atomic legacy lease claim; no arbitrary client device identifier.
- Revision-CAS checkpoints; row-locked first-finalization-wins submit; server/database deadline recheck after lock waits; late requests retain only persisted checkpoints.
- Additive reversible migration; real PostgreSQL 18 concurrency, snapshot, lease and deadline regressions. Isolated test database guarded by name.

**Đang làm dở**
- Local follow-up only; owner integration, formal independent review, latest-head CI and merge gates are still outstanding. This is not slice-4 Done.

**Bước tiếp theo**
- Read docs/tasks/slices/slice-4.1-exam-integrity.md for verification and safe patch application.
- Resolve session-loss recovery and legacy snapshot limitations with owner/product before rollout; do not invent takeover policy.
- Slice-5 must grade the frozen snapshot, never the current question bank.

### 2026-11-04 — slice-5 grading & retakes

**Đã xong**
- `gradeAttempt` grades the frozen snapshot (MC letter/option text, fill_blank `|` alternatives); Speaking/Writing -> `pending_manual`. Lazy `ensureGraded` covers deadline auto-submit; `saveGrade` is conditional and DB trigger `protect_exam_grade` keeps grades immutable.
- Level policies (`exam_grading_policies`, GET/PUT `/api/exam-policies`), per-exam snapshot `pass_percent/max_attempts/retake_cooldown_minutes`.
- Retake in `startAttempt`: new random paper avoiding previous paper, `attempt_number` unique, blocks already_passed/limit/cooldown/closed; zero cooldown never blocks (DB/API clock skew). History `GET /api/exams/:id/history`, manager results `GET /api/exams/:id/results`. ADR-0003.

**Bước tiếp theo**
- Merge PR #6 first, then PR slice-5; slice-9 manual grading for Speaking/Writing.

### slice-23 — grade-import khớp theo mã học viên (code-primary, phone-fallback)

**Đã xong**
- `importGrades` khớp mỗi dòng theo `student_code` trước (map `byCode`); không thấy thì fallback SĐT (map `byPhone` — hành vi cũ). Không khớp cả hai → `student_not_found`. Scope (`out_of_scope`) và `duplicate_in_file` giữ nguyên, xét cả mã lẫn SĐT. Chữ ký thêm `allowedStudentCodes` SAU `allowedPhones`.
- `store.ts`: `selectGradingRows` chọn thêm `users.student_code as student_code`; thêm `listStudentCodesInBranches(branchIds)` (mirror `listStudentPhonesInBranches`, `role='student'` + `student_code is not null`). `GradingRow` (service.ts) thêm `student_code: string | null`.
- `routes.ts`: non-superadmin dựng `allowedStudentCodes` qua `listStudentCodesInBranches` cùng scope với `allowedPhones`, truyền vào `importGrades`.
- Nợ: `// TODO(slice-23)` — khớp SĐT chỉ là fallback chuyển tiếp, gỡ khi 100% học viên đã có `student_code`.
### 2026-11-14 — slice-22 preview nhập điểm (Owner: Hoang Hoang HA, feature/slice-22-cham-bai)

**Đã xong**
- Thêm `previewImportGrades(store, examId, rows, now, allowedPhones)` ở `service.ts`: chạy ĐÚNG logic khớp của `importGrades` (branch-scope, cohort theo lớp, khớp lượt chờ chấm, maxScore + passed, các lý do bỏ qua) nhưng KHÔNG `saveGrade` — trả `GradeImportPreviewRow[]` + `applicable`.
- Route `POST /grading/import/preview` (cùng RBAC `admin|staff`, raw octet-stream như commit) trả `GradeImportPreview` ({rows, errors, applicable}); `/grading/import` giữ nguyên làm bước COMMIT.
- Contract shared mới: `GradeImportPreviewRow`, `GradeImportPreview` (`packages/shared/src/exams.ts`).
- Test: `grade-import-preview.test.ts` (fake store tối thiểu) — will-apply/skip, trùng file, vượt điểm, ngoài phạm vi, không phải exam chấm tay, và preview.applicable == commit.applied; khẳng định preview KHÔNG gọi saveGrade.

**Bước tiếp theo**
- PR slice-22 → dev; sau MVP cân nhắc gộp preview+commit để tránh parse file 2 lần.

### 2026-11-27 — slice-23 hướng an toàn: fallback SĐT không còn im lặng

**Bối cảnh**
- Chủ dự án chọn hướng an toàn thay vì gỡ fallback SĐT: chưa chứng minh được 100% học viên đã có `student_code`, nên gỡ fallback sẽ làm hỏng file Excel cũ của trung tâm. Thay vào đó, fallback được GIỮ nhưng phải LỘ RA.

**Đã xong**
- Tách `matchGradingRow(code, byCode, byPhone)` (export) trả `{ row, matchedBy } | null`; `importGrades` và `previewImportGrades` dùng CHUNG hàm này. Trước đây preview chỉ khớp SĐT nên file theo mã học viên hiện `student_not_found` ở bước xem-trước nhưng lại nhập được ở bước commit — một lời nói dối có sẵn, giờ đã hết.
- `previewImportGrades` nhận tham số thứ 6 `allowedStudentCodes` và áp ĐÚNG scope kép (mã ∪ SĐT) như commit. `routes.ts` route preview dựng `allowedStudentCodes` giống route commit.
- `GradeImportSummary` thêm `matchedByPhone: { row, studentCode }[]` — chỉ ghi khi dòng thực sự được áp (`won`), không ghi dòng bị bỏ qua vì lý do khác.
- Contract shared: `GRADE_IMPORT_MATCHED_BY`, `GradeImportResult.matchedByPhone`, `GradeImportPreviewRow.matchedBy`.
- `TODO(slice-23)` đổi nghĩa: không còn là "nợ phải gỡ fallback" mà là "fallback đang được giám sát"; xem ADR/ghi chú trong `docs/tasks/slices/slice-23-ma-hoc-vien.md`.

**Bước tiếp theo**
- Muốn gỡ hẳn fallback thì cần chủ dự án xác nhận dữ liệu thật: `select count(*) from users where role='student' and student_code is null` phải bằng 0 trên production. Không suy ra được từ code.
- `TODO(slice-23-b)`: bộ đếm mã học viên dùng chung giữa tiền tố lồng nhau (`HV` và `HV1`) — cần đổi format có dấu phân cách (`HV-0001`) + migrate mã đã cấp. Chờ chủ dự án duyệt vì đổi mã đã in trên giấy tờ.
