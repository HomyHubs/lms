# ADR 0007 — Staff work days and teacher teaching hours (slice-8)

Status: Accepted with the slice-8 PR.

## Context

Slice-8 needs staff time keeping and a monthly payroll summary of teaching hours. The backlog
forbids computing teaching hours from the planned schedule alone: a cancelled lesson must not be
paid, a make-up lesson must be, and a substitute teacher must get the hours instead of the
planned one. Slice-6 already records who marked attendance for each session. No external payroll
integration is required — an exported file is enough.

## Decision

1. **Held = not cancelled + attendance recorded.** A session counts as taught only when
   `cancelled_at` is null and at least one attendance record exists. The teacher who taught it is
   the latest recorder (`attendance_records.recorded_by`), so a substitute gets the hours.
2. **Planned teacher = session creator.** `class_sessions.planned_teacher_id` (backfilled from
   `created_by`) is the scheduled teacher. A held session planned for someone else is a
   substitute; a regular planned session that is cancelled, or is in the past without attendance,
   is *missed* and never paid. Future sessions without attendance are *scheduled*.
3. **Duration per session.** `duration_minutes` (default 90, 15..480) is the paid length; teaching
   minutes = sum over held sessions.
4. **Cancel and make-up.** `POST /sessions/:id/cancel` (assigned teacher only) works only for a
   session without attendance (409 otherwise). A make-up session (`makeup_for_session_id`) may
   only replace a cancelled/untaught session of the same class; it is not counted as planned, so
   "3 taught incl. 1 make-up, 1 missed" reports held 3, missed 1, makeup 1.
5. **Staff shifts.** Table `staff_shifts` with check-in/check-out (one open shift per user,
   partial unique index). Worked minutes count only closed shifts; a work day is a distinct local
   date (`Asia/Ho_Chi_Minh`) with a check-in. Teachers may also check in.
6. **Report.** `GET /reports/work-hours?month&branchId` (admin, limited to assigned branches like
   slice-1/7): per-teacher summary, per-staff summary, and the planned-vs-actual session list.
   `GET /me/timesheet` gives staff/teachers their own month. Excel export is built in the browser
   with the slice-7 `buildXlsx` helper (3 sheets); no server-side file generation.

## Consequences

- Hours follow real attendance: forgetting to mark attendance shows the session as missed, which is
  the intended pressure on teachers to record it.
- "Who taught" is per session, not per student; mixed recorders resolve to the latest one.
- Shift corrections (forgotten check-out) are not editable yet; the open shift is visible and unpaid
  until checked out. An admin edit flow can be added later without schema changes.
- Users have no full-name column yet, so reports show phone numbers.
