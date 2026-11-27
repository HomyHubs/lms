# ADR 0014 — Multi-class attendance and teacher attribution (slice-6.1)

Status: Accepted. Supersedes the recorder-as-teacher rule in ADR 0007.

## Context

Staff and branch-scoped admins must be able to mark several classes without being mistaken for the teacher in payroll. A recorded arrival is not proof that a student remains in the room; no departure check is required. Existing records have no arrival time.

## Decisions

1. Record actual teacher attribution in an append-only session event log (teacher, actor, time). Backfill each held session with the latest existing attendance recorder, as the old report did. Teacher attendance appends an attribution event as before. Staff/admin must explicitly confirm the actual assigned teacher when marking; never infer a substitute from the planned schedule or attribute teaching to the recorder. One transaction records attribution and attendance together. Attendance corrections must also retain an audit trail rather than overwrite history.
2. Extend attendance records additively with nullable arrival timestamp and late minutes (5, 10, 15, 20). A bulk present selection records status, not a fabricated arrival time. Explicitly entered arrival times are instants, may be unknown, and are not backfilled from old recorded_at. Absence/excused cannot carry arrival or lateness; corrections may clear them. Notes capture early departure; there is no departure check.
3. Teachers retain access to their assigned classes. Staff/admin may view and mark sessions only for assigned branches; out-of-scope class/session returns 404. The server validates roster membership, assigned teacher and inputs, not just the client. Cancellations and session creation remain teacher-only.
4. Provide a branch-scoped endpoint for today's non-cancelled sessions with class and roster, using Asia/Ho_Chi_Minh for the local date. Show multiple sessions and bulk select/unselect by class. Show counts and students as recorded attendance, with clear unknown and no claim of live physical presence.
5. Changes are additive. Rollback removes the new fields and both event logs, including post-upgrade audit history; it must never be used casually on production. Preserve old attendance and payroll attribution during upgrade.

## Verification

On disposable PostgreSQL, run the migration down and up with pre-upgrade attendance and verify the original row, historical teacher attribution, audit event and unknown arrival. Store tests cover staff corrections, teacher attribution, arrival preservation, audit and cancellation races. Route tests cover scope and multiple sessions; UI tests cover selection, lateness, arrival and early-departure notes. These tests do not prove actual physical presence.
