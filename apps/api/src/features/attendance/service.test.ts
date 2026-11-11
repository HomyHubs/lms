import { describe, expect, it } from 'vitest'
import { aggregateRates, summarize } from './service.js'

describe('summarize (attendance rate formula)', () => {
  it('returns a null rate when only excused or no sessions exist', () => {
    expect(summarize([]).ratePercent).toBeNull()
    expect(summarize(['excused'])).toEqual({
      present: 0,
      late: 0,
      absent: 0,
      excused: 1,
      total: 1,
      ratePercent: null,
    })
  })

  it('counts late as attended and excludes excused from the denominator', () => {
    // attended = present 2 + late 1 = 3; counted = 3 + absent 1 = 4 -> 75%
    const s = summarize(['present', 'present', 'late', 'absent', 'excused'])
    expect(s).toEqual({ present: 2, late: 1, absent: 1, excused: 1, total: 5, ratePercent: 75 })
  })

  it('rounds the rate to one decimal', () => {
    expect(summarize(['present', 'absent', 'absent']).ratePercent).toBe(33.3)
    expect(summarize(['present', 'present', 'absent']).ratePercent).toBe(66.7)
  })
})

describe('aggregateRates', () => {
  it('computes per-student summaries sorted by phone plus an overall summary', () => {
    const { overall, students } = aggregateRates([
      { student_id: 'b', phone_number: '0902', first_name: null, last_name: null, status: 'absent' },
      { student_id: 'a', phone_number: '0901', first_name: null, last_name: null, status: 'present' },
      { student_id: 'a', phone_number: '0901', first_name: null, last_name: null, status: 'absent' },
      { student_id: 'b', phone_number: '0902', first_name: null, last_name: null, status: 'present' },
      { student_id: 'b', phone_number: '0902', first_name: null, last_name: null, status: 'present' },
    ])
    expect(students.map((s) => [s.phoneNumber, s.summary.ratePercent])).toEqual([
      ['0901', 50],
      ['0902', 66.7],
    ])
    expect(overall).toMatchObject({ present: 3, absent: 2, total: 5, ratePercent: 60 })
  })
})
