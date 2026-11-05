# ADR 0012 — Exam history and attempt report (slice-13)

Status: Accepted with the slice-13 PR.

## Context

Attempts already store attempt number, start/deadline/submit times and the graded result (slice-5),
but only per exam. Centres need a student's history across every exam, retake counts and pass rates
for a date range, and the history must survive exam deletion (`exam_attempts.exam_id` was
`on delete cascade`).

## Decision

1. **History is kept.** `exam_attempts.exam_id` is `on delete restrict`: an exam with attempts can no
   longer be deleted. Index `(student_id, started_at desc, id desc)` serves the
   history list.
2. **Submit reason.** `exam_attempts.submit_reason` is `manual | deadline_auto`, written where an
   attempt is finalized (slice-4.1): `manual` when the student submits in time, `deadline_auto` when
   the deadline closes the attempt (late submit or a save after the deadline). Older rows stay `null`.
   The planned `late_checkpoint` value was dropped: no code path produces it.
3. **Endpoints.** `GET /me/exam-attempts` (student, own rows), `GET /students/:id/exam-attempts`
   (admin/teacher; a teacher gets 403 unless the student is enrolled in a class of the caller's
   branches) and `GET /reports/exam-attempts` (admin/teacher, branch scope as slice-7; a branch outside
   the scope is 404). Filters `from`/`to` are calendar days in `Asia/Ho_Chi_Minh` applied to
   `started_at`; timestamps are returned as ISO UTC and shown in local time by the web app.
4. **Paging and limits.** History pages hold 50 rows with a keyset cursor `<started_at>~<id>`; the
   report returns at most 5000 detail rows.
5. **Report figures.** Per exam: distinct students, attempts, retakes (`attempt_number > 1`),
   first-attempt pass rate and final pass rate over distinct students, average and best percent over
   graded attempts. Excel export has a summary sheet and a per-attempt sheet.

## Consequences

- The API has no exam delete endpoint; a direct delete of an exam that was sat fails on the foreign key.
  A future delete/archive feature must handle that.
- Per-question correctness stays hidden from students (slice-5 decision).
- A score trend chart is left for later.
