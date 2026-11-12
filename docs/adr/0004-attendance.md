# ADR 0004 — Attendance: class teachers, sessions and attendance rate (slice-6)

Status: Accepted with the slice-6 PR.

## Context

Slice-6 requires that only the teacher of a class can mark attendance (real RBAC, not stubbed),
that students and admins can review history, and that an attendance rate per student/class/course
is available as input for slice-7 grading. Before slice-6 the schema had no link between a teacher
and a class (`enrollments` only links students), and no notion of a class session.

## Decision

1. **`class_teachers(class_id, teacher_id)`** — admins (within their branch scope) assign users with
   role `teacher` to a class. This table is the single source for "teacher of this class".
2. **`class_sessions`** — one row per class × local date × local start time (`date` + `time`, no
   timezone; unique). Created by an assigned teacher. Dates/times are formatted in SQL
   (`to_char`) so no JS timezone conversion can shift the day.
3. **`attendance_records(session_id, student_id)`** — status `present | absent | late | excused`
   (CHECK constraint) + optional note. Marking is an idempotent upsert, so a teacher can correct a
   session. Only students currently enrolled in the class can be marked (validated server-side).
4. **RBAC** — teacher: create sessions and mark only for assigned classes; admin: read-only within
   branch scope (assign teachers, review sessions, rates, history); student: own history only.
   Classes outside the caller's access return 404 so their existence is not leaked.
5. **Attendance rate** = (present + late) / (present + late + absent) × 100, rounded to 1 decimal.
   `excused` is excluded from the denominator; `null` when nothing is countable. Exposed via
   `GET /attendance/rates?classId|courseId|studentId` (overall + per student).

## Consequences

- Slice-7 reads rates from the same formula (`summarize` in `apps/api/src/features/attendance`).
- Unenrolling a student keeps their past records (history stays truthful) but removes them from
  future rosters.
- Notifications/reminders for attendance are out of scope (slice-9).
- Migration `20261105000000_attendance.sql` is additive and reversible (drops only the 3 new tables).
