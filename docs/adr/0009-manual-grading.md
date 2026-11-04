# ADR 0009 — Manual grading of Speaking/Writing attempts (slice-9a)

Status: Accepted with the slice-9a PR.

## Context

Slice-5 grades objective skills automatically and leaves Speaking/Writing attempts as
`pending_manual`: no score, no retake. Grades are written once and protected by the
`protect_exam_grade` trigger. Teachers need a screen to grade those attempts, and students need to
see the score and the teacher's comment.

## Decision

1. **Same columns, same write-once rule.** A manual grade fills the existing `score`, `max_score`,
   `passed`, `graded_at`, `grading_detail` of `exam_attempts`, plus two new columns: `graded_by`
   (user, `on delete set null`) and `grader_feedback` (≤ 2000 chars). The trigger now also freezes
   both new columns once `graded_at` is set (only `graded_by → null` from the FK is allowed).
   No regrade in this slice.
2. **Score per question.** The grader sends a whole score `0..points` for every question of the
   frozen paper snapshot and nothing else; otherwise `invalid_scores`. Pass/fail uses the exam's
   frozen `pass_percent` (`score*100 >= pass_percent*max_score`), the same rule as auto grading,
   so the retake flow of slice-5 applies unchanged after a failed manual grade.
3. **First grader wins.** `saveGrade` only writes when `graded_at` is null; a second grader gets
   `already_graded` (409).
4. **Expired attempts are gradable.** An unsubmitted attempt past its deadline is listed in the
   queue and finalized from its saved checkpoint when opened, like the student-side deadline path.
   Attempts still in progress return `in_progress` (409).
5. **Access.** `GET /grading/attempts`, `GET /grading/attempts/:id`, `POST /grading/attempts/:id/grade`
   for Admin + Teacher (all branches, same scope as exam creation). Graders see the student's
   answers; students keep seeing only aggregate score, pass/fail and the feedback.

## Consequences

- Students learn about the grade when they open the exam again; push notifications come in slice-9b.
- Users have no name column, so the queue shows the student's phone number.
- Branch-scoped grading (teacher sees only own classes) needs exams linked to classes, which they
  are not yet.
