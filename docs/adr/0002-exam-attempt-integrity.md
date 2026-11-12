# ADR 0002 — Exam attempt integrity (local follow-up for PR #6)

Status: Proposed for independent owner review; not a product approval or merge authorization.

## Context

PR #6 belongs to An Vo. This isolated follow-up starts at 0766ee749230328e6bf7b9165984d0561f4e9dd5. No handoff has been given. Slice-4 requires actual no-repeat generation, server time limits, one device/attempt, and student-safe responses. The recorded N001 decision allows late finalization but only counts answers already saved. Assignment and slice-5 remain out of scope. There is no decision-backlog file at this head. The root handoff records no additional exam policy.

## Contract fixed before implementation

- Keep the recorded deadline = startedAt + durationMinutes; closing the exam prevents new starts, not a different invented cutoff for existing attempts.
- `POST /exams/:id/answers` checkpoints the full answer map before the deadline. A nonnegative `revision` is an optimistic concurrency token. Return 409 on stale revision. Return the canonical submitted attempt after expiry without incorporating late input.
- `POST /exams/:id/submit` is idempotent. The first atomic finalization wins; retries return that canonical result. At/after the deadline discard request answers, retain persisted checkpoints, and finalize at the deadline. Server/database time, never client timestamps, controls acceptance.
- Attempt start, read, autosave and submit are bound to the existing authenticated session cookie (server-side hash, not a caller-chosen device header). Another login session receives 409 `session_conflict`. This is a one-session lease, not proof of physical hardware. No lease timeout, takeover, recovery or proctoring policy is invented here; owner/product must decide recovery before deployment. Legacy attempts claim an unbound lease atomically.
- Snapshot the ordered full question content and grading key at attempt creation; never return grading fields in student views. An additive migration backfills legacy rows from currently available bank content; it cannot reconstruct earlier edits/deletions. Missing legacy content fails closed, not silently replaces questions.
- Paper identity compares sets, not ordering. Where multiple bank IDs have identical question content they represent one content variant. Select at most one per variant. If no distinct non-repeating paper exists, return explicit `paper_unavailable` (409), never silently repeat. There is no bank variant-family metadata at this head; semantic/paraphrase grouping needs an explicit future product contract, not heuristics.
- Blueprint creation is within existing Admin/Teacher scope and reuses CreateExamRequest and POST /exams.

## Persistence

Append-only reversible migration adds immutable snapshot text, session binding and answer revision. Existing migration files remain unchanged. SQL checkpoint/finalization updates are conditional and atomic, re-reading the canonical row on races. The database clock rechecks the cutoff after lock wait.

## Compatibility / risks

Checkpoint endpoint and revision are additive. Idempotent submit intentionally replaces the former already_submitted error. Late payloads no longer count; the UI must checkpoint before expiry and show checkpoint failures. Recovery from lost authenticated sessions is deliberately not authorized. Local implementation and tests are not slice-4 Done; owner integration, review, latest-head CI and merge gates remain required.
