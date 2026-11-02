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
