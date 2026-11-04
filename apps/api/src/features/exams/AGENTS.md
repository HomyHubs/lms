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
