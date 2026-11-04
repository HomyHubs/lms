import { describe, expect, it } from 'vitest'
import { localToday, monthRange, summarizeShifts, summarizeTeachers, type ShiftRow, type WorkSessionRow } from './service.js'

const T1 = 't1'
const T2 = 't2'
const PHONES = new Map([
  [T1, '0911000001'],
  [T2, '0911000002'],
])
const TODAY = '2026-11-20'

function session(id: string, over: Partial<WorkSessionRow>): WorkSessionRow {
  return {
    id,
    class_id: 'c1',
    class_name: 'Starter A',
    session_date: '2026-11-02',
    starts_at: '18:00',
    duration_minutes: 90,
    planned_teacher_id: T1,
    makeup_for_session_id: null,
    cancelled_at: null,
    taught_by: null,
    ...over,
  }
}

describe('summarizeTeachers', () => {
  it('counts 3 taught sessions when a teacher teaches 2, misses 1 and teaches its make-up', () => {
    const sessions = [
      session('s1', { session_date: '2026-11-02', taught_by: T1 }),
      session('s2', { session_date: '2026-11-04', taught_by: T1 }),
      session('s3', { session_date: '2026-11-06', cancelled_at: '2026-11-05T10:00:00Z' }),
      session('s4', { session_date: '2026-11-07', taught_by: T1, makeup_for_session_id: 's3' }),
    ]
    expect(summarizeTeachers(sessions, PHONES, TODAY)).toEqual([
      {
        teacherId: T1,
        phoneNumber: '0911000001',
        planned: 3,
        held: 3,
        missed: 1,
        makeup: 1,
        substitute: 0,
        taughtMinutes: 270,
      },
    ])
  })

  it('pays a substitute, treats past sessions without attendance as missed and future ones as not yet due', () => {
    const sessions = [
      session('s1', { taught_by: T2, duration_minutes: 60 }),
      session('s2', { session_date: '2026-11-10' }),
      session('s3', { session_date: '2026-11-25' }),
    ]
    const [t1, t2] = summarizeTeachers(sessions, PHONES, TODAY)
    expect(t1).toMatchObject({ teacherId: T1, planned: 3, held: 0, missed: 1, taughtMinutes: 0 })
    expect(t2).toMatchObject({ teacherId: T2, planned: 0, held: 1, substitute: 1, taughtMinutes: 60 })
  })
})

describe('summarizeShifts', () => {
  it('pays closed shifts only and counts distinct local work days', () => {
    const shift = (id: string, workDate: string, inAt: string, outAt: string | null): ShiftRow => ({
      id,
      user_id: 'u1',
      check_in_at: new Date(inAt),
      check_out_at: outAt ? new Date(outAt) : null,
      work_date: workDate,
    })
    const summary = summarizeShifts([
      shift('a', '2026-11-02', '2026-11-02T01:00:00Z', '2026-11-02T05:30:00Z'),
      shift('b', '2026-11-02', '2026-11-02T07:00:00Z', '2026-11-02T09:00:00Z'),
      shift('c', '2026-11-03', '2026-11-03T01:00:00Z', null),
    ])
    expect(summary).toEqual({ workedMinutes: 390, workDays: 2, openShifts: 1 })
  })
})

describe('month helpers', () => {
  it('builds a half-open month range across the year end and uses Vietnam local dates', () => {
    expect(monthRange('2026-12')).toEqual({ from: '2026-12-01', to: '2027-01-01' })
    expect(monthRange('2026-02')).toEqual({ from: '2026-02-01', to: '2026-03-01' })
    // 18:30 UTC is already the next day in Asia/Ho_Chi_Minh (UTC+7).
    expect(localToday(new Date('2026-11-30T18:30:00Z'))).toBe('2026-12-01')
  })
})
