# Auth supplemental work log — slice-2.1

2026-11-02; owner coding agent; branch bugfix/slice-2.1-reset-security.

## Đã xong
Security containment: server-verified destination only; recipient injection and unavailable channels rejected; legacy unverified identities cannot issue or redeem OTPs. Email delivery has no console secret fallback, no recipient/OTP/provider-body logs. Logger redacts sensitive headers/bodies. Atomic conditional consume/password update invalidates other outstanding codes and sessions. Provider failure never activates a new OTP.

## Blocker
users.email has no verification evidence. No production identity is eligible until verification/provisioning is decided and implemented. No synthesized email, migration/backfill or assumed verification. Optional channels remain inaccessible. See ADR0002 and docs/tasks/slices/slice-2.1-reset-security.md.

## Kiểm chứng
Full branch build/lint/typecheck/test passed: API 107, web 12; shared count in gate log. Real Docker PostgreSQL18 integration passed: 10 migrations up/down/up, legacy fail-closed, concurrent consume/replay, password-update rollback. Test container removed automatically; no user DB or secrets accessed.

## Tiếp theo
Independent review/CI; do not mark Done before merge and DoD. Integration command after build: pnpm --filter @lms/api exec node scripts/reset.integration.mjs.

## 2026-11-03 — PR8 CI/test closeout

Reviewed dedicated `reset-postgres` PR job: disposable loopback-only PostgreSQL18/tmpfs, no secrets or runtime DATABASE_URL, mandatory direct assertions with pipefail + exact PASS sentinel. Nested finally attempts Docker cleanup even if pool shutdown fails; sentinel follows successful assertions and cleanup. No tests disabled/skipped and no business-policy change.

Local evidence is not PostgreSQL CI evidence: only actual `guard` and `reset-postgres` results for the latest pushed PR head can establish CI PASS. The missing verified-identity/provisioning decision remains the real-delivery blocker; production fail-closed remains intentional. Review/merge and feature DoD remain pending.

Fresh local build/lint/typecheck/test: `FULL_GATES_EXIT_CODE=0`, shared14 + API107 + web12 =133 passing tests (25 files), no skips. Fresh standalone PG18 run: 10 migration up/down/up, legacy fail-closed, concurrent consume/replay and rollback all PASS; `RESET_PG_INTEGRATION_PASS` emitted after Docker cleanup and `RESET_INTEGRATION_EXIT_CODE=0`. Local logs: `%TEMP%/postman-shell-term_1793679373205_h2lvvfabg.log` and `%TEMP%/postman-shell-term_1793679399423_3d11423rp.log`. Whitespace check passed. Next: push scoped commit and verify exact-head CI, not old-head status.
