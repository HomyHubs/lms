# ADR 0006 — Student classification, admin dashboard and report export (slice-7)

Status: Accepted with the slice-7 PR.

## Context

Slice-7 gives admins a dashboard of exam results and attendance, a student ranking with retake
tracking and an automatic classification. The owner fixed the weights at exam 90% + attendance 10%,
configurable later per level. Numbers must be real data, limited to the admin's assigned branches
(slice-1), and the report must be exportable to Excel/PDF.

## Decision

1. **Policy per level.** Table `student_grading_policies` (one row per level, seeded by the
   migration): `exam_weight + attendance_weight = 100` (default 90/10) and descending band minimums
   `excellent_min >= good_min >= average_min` (default 85/70/50, `weak` below). It is separate from
   the slice-5 exam pass policy (`/exam-policies`); the shared types are named
   `ClassificationPolicy*` and the endpoints are `GET/PUT /reports/classification-policies`.
2. **Formula, per enrollment (student in a class).**
   - exam score = average over the exams of the class's course level of the best graded attempt %;
   - attendance rate = slice-6 `summarize` of the class sessions (present + late count);
   - final = `examWeight% * exam + attendanceWeight% * attendance`, rounded to 1 decimal;
   - no countable attendance -> exam score alone (a missing roll call never punishes);
     no graded exam -> unclassified, no rank.
3. **Ranking and retakes.** Competition rank (1, 2, 2, 4) by final score over the filtered scope.
   `retakes = attempts - exams taken`; `pendingRetakes` = failed exams with attempts left.
4. **Dashboard.** `GET /reports/students?branchId&levelId&classId&from&to` returns totals,
   classification counts, pass/fail by class, level and month (month of `graded_at`, counted per
   attempt) and the ranking. Admin only; scope = `branchIdsForUser`, a `branchId` outside it -> 404.
5. **Export without new dependencies.** Excel: a minimal SpreadsheetML workbook (inline strings,
   numeric cells, 4 sheets) built in the browser with `fflate` (already a web dependency) from the
   data the API returned. PDF: print-friendly page (`print:hidden` on controls) + `window.print()`,
   which keeps Vietnamese diacritics without embedding fonts. Charts are plain CSS bars.

## Consequences

- One source of numbers: the export is exactly what the dashboard shows; no server-side export code.
- A server-generated PDF (e.g. scheduled e-mail reports) would need a renderer later; out of scope.
- The report is computed on request with 4 flat queries; large centers may need caching later.
- Migration `20261107000000_student_grading.sql` is additive and reversible (drops the table).
