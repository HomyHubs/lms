# AGENTS.md — Exams web

## Bối cảnh feature

- Slice-4 owner: An Vo, PR #6. Independent follow-up branch: `bugfix/slice-4.1-exam-integrity`.
- Dependencies: @lms/shared contracts, @/lib/api public HTTP helpers, auth/useAuth session hook, TanStack Query.
- Contracts: POST /api/exams creates blueprint (Admin/Teacher); POST /api/exams/:id/answers checkpoints answers with expected revision; submit returns canonical idempotent result.
- ADR: docs/adr/0002-exam-attempt-integrity.md.

## Nhật ký liên tục

### 2026-11-03 — Independent integrity follow-up

**Đã xong**
- Admin/Teacher blueprint creation form with shared validation, local-time inputs converted to ISO and list refresh.
- Student changes queue revision-aware checkpoints; success/failure is visible. Inputs stop accepting changes at deadline; server remains authoritative.
- Regression coverage for blueprint validation/create and checkpoint request shape, plus existing student submit, expiry and resume tests.

**Đang làm dở**
- Owner integration and independent review; no remote push/merge or production rollout.

**Bước tiếp theo**
- See docs/tasks/slices/slice-4.1-exam-integrity.md for gates and handoff.
- Perform owner/manual browser acceptance with two login sessions, refresh and deadline/offline scenarios. Browser/device takeover and recovery require product approval, not silent client workarounds.
