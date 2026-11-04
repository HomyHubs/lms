# ADR 0003 — Exam grading, pass threshold and retakes (slice-5)

Status: Proposed with the slice-5 PR; needs independent review before merge. Builds on ADR 0002 (frozen snapshots, session lease, idempotent submit).

## Context

Slice-5 requires: auto-grading multiple choice / fill-blank against the answer key; a pass threshold configurable per level or course; automatic retake with a different random paper, a maximum attempt count and a cooldown; and a history of every attempt for audit. Speaking/Writing grading is slice-9 (postponed by owner decision 2026-11-02).

## Decisions

- **Grade the frozen snapshot only.** `exam_attempts.question_snapshot` (ADR 0002) carries `correct_answer` and `points` at paper-generation time. Later bank edits/deletions never change a grade.
- **Answer matching.** Normalize both sides: Unicode NFC, trim, collapse whitespace, case-insensitive. Questions with options accept the option letter (A/B/…) or the option text interchangeably. Fill-blank `correct_answer` may list alternatives separated by `|`. No partial credit.
- **Pass rule.** `score * 100 >= pass_percent * max_score` in integers (no rounding drift).
- **Threshold source.** Per level: table `exam_grading_policies` (defaults 50% / 3 attempts / 0 min cooldown). The values are **copied onto each exam at creation**, optionally overridden per exam in the create request. Changing a level policy affects only exams created afterwards; existing exams and attempts keep their recorded threshold. No course-level policy: exams belong to a level, not a course, at this head (add when exams are assigned to courses/classes).
- **Grading moment.** Lazily, the first time a finalized attempt is read (submit response, resume, history). The write is conditional (`graded_at is null`) so concurrent readers converge on one grade; a database trigger rejects any change to score/max_score/passed/graded_at/grading_detail once `graded_at` is set, and forbids renumbering attempts.
- **Retakes.** `attempt_number` (unique per exam + student) replaces the one-attempt-per-exam unique key. Eligibility is computed, not stored: latest attempt failed, `attempt_number < max_attempts`, `now >= submitted_at + cooldown`, and the exam window still open. The student starts the retake explicitly (`POST /exams/:id/attempts`); an attempt force-finalized at the deadline returns its result first. The new paper avoids the previous paper of the same exam (non-repeat rule of ADR 0002).
- **Speaking/Writing.** Not auto-graded: result `pending_manual`, no grade written, no retake offered. TODO(slice-9).
- **Disclosure.** Students see only the aggregate (score, max, percent, threshold, pass/fail). Per-question correctness (`grading_detail`) stays server-side for audit because retakes draw from the same bank.
- **History/audit.** Every attempt row is retained. `GET /exams/:id/history` (student, own attempts) and `GET /exams/:id/results` (Admin/Teacher, all students) list attempt number, paper question ids, timestamps and result.
- **Policy API.** `GET /exam-policies` (Admin/Teacher), `PUT /exam-policies/:level` (Admin).

## Persistence

Migration `20261104000000_exam_grading_retakes.sql` is additive and reversible. Rolling back deletes retake rows (`attempt_number > 1`) because the old schema allows one attempt per exam — never roll back production after retakes exist without an export.

## Risks

- Lazy grading: an attempt finalized by deadline but never reopened stays ungraded until read (history/results endpoints grade on read).
- Exact-match grading can reject reasonable spelling variants; teachers add `|` alternatives to fill-blank keys.
- Slice-5 depends on PR #6 (slice-4 + 4.1 integrity), not merged yet; see backlog exception note.
