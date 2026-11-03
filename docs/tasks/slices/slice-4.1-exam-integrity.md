# Slice-4.1 — Independent local exam-integrity follow-up

Date: 2026-11-03. Status: local follow-up for owner review, NOT merged / NOT slice-4 Done.

## Ownership and isolation

- Slice-4 remains owned by An Vo, PR #6, `feature/slice-4-tao-de-thi-online`.
- Follow-up worktree: `.agent-worktrees/slice4-followup`; branch: `bugfix/slice-4.1-exam-integrity`.
- Base: `0766ee749230328e6bf7b9165984d0561f4e9dd5` (remote HEAD reverified read-only).
- Root `dev` remains `5b1df6236421fecb743c731c2770657c850205a4`; remote `dev` remains `4b6888de3d9a673d167e7369d922df46de444b16`.
- PR #6 rechecked: OPEN, no review decision, existing guard SUCCESS completed 2026-09-30T08:41:47Z. That CI is for the owner base, NOT this local patch.
- No owner-branch push, remote PR mutation, review, merge, root checkout/reset or changes to another follow-up worktree.
- Root AGENTS rollup, CURRENT, MVP-BACKLOG and other slice records intentionally unchanged. Email-only OTP, postponed WhatsApp/slice-9, and slice-7 90%+10% decisions remain untouched.

## Delivered

See [ADR 0002](../../adr/0002-exam-attempt-integrity.md) for the proposed contracts and deployment caveats.

1. Immutable ordered question and grading snapshot, student-safe field projection, additive migration with legacy backfill and immutable identity trigger.
2. Exact-content variant deduplication and explicit `paper_unavailable` when a different paper cannot be generated. Previous paper identity uses frozen content even if bank IDs are edited.
3. One authenticated-session lease for start/read/checkpoint/submit; atomic legacy claim; other sessions receive 409. This is not physical-device attestation.
4. Revision-CAS checkpoints and server/database deadline checks. Expired checkpoints/submit/resume finalize using only already-persisted answers. Client timestamps are not accepted.
5. Row-locked first-finalization-wins idempotent submission, including concurrent different payloads, retries and database clock recheck after lock wait.
6. Admin/Teacher blueprint creation UI using existing API/RBAC/shared schema; student checkpoint queue, visible save state and deadline input cutoff.
7. API unit/route regressions, browser-component tests and real PostgreSQL 18 tests for concurrency, deadline, immutable content and session lease.

## Verification / reproduce

Toolchain: Node v24.20.0, pnpm 11. PostgreSQL test container: `lms-slice4-pg18-followup`, image `postgres:18-alpine`, bound only to `127.0.0.1:55434`, database `lms_slice4_test`.

Inside the isolated worktree, set TEST_DATABASE_URL to this disposable test database, then run:

```text
pnpm -r build
pnpm -r lint
pnpm -r typecheck
pnpm -r test
git diff --check
```

Migration runner: `amacneil/dbmate:2.35.1`, network `container:lms-slice4-pg18-followup`, mounted worktree `db` directory, database URL inside container uses localhost:5432. Run `--no-dump-schema up`, then `down` (one migration only), then `up` again. Never run this rollback against production. Fresh migration chain and rollback/reapply on populated disposable DB both succeeded.

Final result: build, lint (zero warnings), typecheck, tests and `git diff --check` all PASS. Tests: shared 14/14, API 130/130 across 18 files (including all 6 PostgreSQL integration tests, not skipped), web 16/16 across 9 files; 160 tests total. The final run printed `SLICE4_FINAL_GATES_PASS`.

Final gate evidence and patch are exported separately under `.agent-worktrees/slice4-handoff/`; the patch is not recursively committed inside itself. Feature-specific AGENTS.md files record this session. Exact commit/checksum are in the exported handoff record.

## Safe owner handoff (no automatic integration)

1. Inspect exported patch and SHA-256, this document and ADR 0002.
2. Recheck owner remote HEAD. If it differs from the base above, stop and reconcile; do not blindly apply or overwrite owner work.
3. In a NEW owner-approved integration branch/worktree at the verified base, use `git am <exported-patch>` (or owner-selected cherry-pick). Use `git am --abort` if application fails; do not force-push.
4. Run migrations and all four gates on that integrated head, independent formal review, latest-head CI, and owner/product approval of ADR caveats before any merge. Existing base CI does not approve this patch.
5. Do not push this patch directly to An Vo's branch. No remote follow-up branch/PR was created.

## Remaining approval / rollout work

- Owner/product approval for session-loss recovery; no lease takeover/timeout was invented. A new login cannot recover a bound attempt automatically.
- Legacy backfill can only copy current bank content; it cannot reconstruct historical edits or deleted questions. Incomplete snapshots fail closed and require owner recovery.
- Variant equivalence is exact stored content, not semantic/paraphrase families; explicit metadata/product policy is needed for semantic variants.
- Manual browser acceptance (two sessions, refresh, offline checkpoint failure, expiration) and load/production migration review remain owner acceptance, not claimed as executed here.
- Expiry finalization is lazy on API access; no background scheduler was added.
- Assignment, grading, retakes and proctoring remain outside this follow-up. Slice-5 must consume the frozen grading key.
- Disposable test container is stopped after verification; no production database was touched. Keep/restart it only if needed for local reproduction.
