import { describe, expect, it } from 'vitest'
import type { WorkSessionDetail } from '@lms/shared'
import { hoursByClass, sessionsForTeacher } from './work-hours-detail'

function session(over: Partial<WorkSessionDetail> & { sessionId: string }): WorkSessionDetail {
  return {
    classId: 'c1',
    className: 'Lớp 1',
    sessionDate: '2026-11-03',
    startsAt: '18:00',
    durationMinutes: 90,
    plannedTeacherPhone: '0901',
    taughtByPhone: null,
    status: 'scheduled',
    isMakeup: false,
    isSubstitute: false,
    ...over,
  }
}

describe('sessionsForTeacher', () => {
  it('keeps sessions where the teacher was planned or actually taught, sorted by date', () => {
    const sessions: WorkSessionDetail[] = [
      session({ sessionId: 'b', sessionDate: '2026-11-10', taughtByPhone: '0901', status: 'held' }),
      session({ sessionId: 'a', sessionDate: '2026-11-03', plannedTeacherPhone: '0901' }),
      session({ sessionId: 'x', plannedTeacherPhone: '0999', taughtByPhone: '0999' }),
      session({ sessionId: 'c', sessionDate: '2026-11-05', plannedTeacherPhone: '0999', taughtByPhone: '0901', status: 'held' }),
    ]
    expect(sessionsForTeacher(sessions, '0901').map((s) => s.sessionId)).toEqual(['a', 'c', 'b'])
    expect(sessionsForTeacher(sessions, '0777')).toEqual([])
  })
})

describe('hoursByClass', () => {
  it('sums held minutes per class, counts missed sessions, and sorts by minutes desc', () => {
    const sessions: WorkSessionDetail[] = [
      session({ sessionId: '1', classId: 'c1', className: 'Lớp 1', status: 'held', taughtByPhone: '0901' }),
      session({ sessionId: '2', classId: 'c1', className: 'Lớp 1', status: 'held', taughtByPhone: '0901', durationMinutes: 60 }),
      session({ sessionId: '3', classId: 'c1', className: 'Lớp 1', status: 'missed' }),
      session({ sessionId: '4', classId: 'c2', className: 'Lớp 2', status: 'held', taughtByPhone: '0901', durationMinutes: 120 }),
      session({ sessionId: '5', classId: 'c3', className: 'Lớp 3', status: 'cancelled' }),
    ]

    expect(hoursByClass(sessions)).toEqual([
      { classId: 'c1', className: 'Lớp 1', heldSessions: 2, taughtMinutes: 150, missedSessions: 1 },
      { classId: 'c2', className: 'Lớp 2', heldSessions: 1, taughtMinutes: 120, missedSessions: 0 },
      { classId: 'c3', className: 'Lớp 3', heldSessions: 0, taughtMinutes: 0, missedSessions: 0 },
    ])
  })

  it('returns an empty list when there are no sessions', () => {
    expect(hoursByClass([])).toEqual([])
  })
})
