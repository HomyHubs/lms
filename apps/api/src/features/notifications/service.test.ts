import { describe, expect, it } from 'vitest'
import {
  MAX_DELIVERY_ATTEMPTS,
  makeReminderRunner,
  toE164,
  type NewNotification,
  type NotificationSender,
  type NotificationsStore,
  type RetakeCandidateRow,
  type SessionCandidateRow,
} from './service.js'

const NOW = new Date('2026-11-11T03:00:00Z')
const STUDENT_PHONE = '0933000001'

interface FakeRow extends NewNotification {
  id: string
  status: 'pending' | 'sent' | 'failed'
  attempts: number
  lastError: string | null
}

type FakeStore = NotificationsStore & { rows: FakeRow[]; sessionWindow?: { from: Date; to: Date } }

/** In-memory store honouring the unique dedupe key like the real table. */
function makeFakeStore(retakes: RetakeCandidateRow[], sessions: SessionCandidateRow[]): FakeStore {
  const rows: FakeRow[] = []
  const store: FakeStore = {
    rows,
    async listRetakeCandidates() {
      return retakes
    },
    async listSessionCandidates(from, to) {
      store.sessionWindow = { from, to }
      return sessions
    },
    async enqueue(items) {
      const fresh = items.filter((n) => !rows.some((r) => r.dedupeKey === n.dedupeKey))
      for (const n of fresh) rows.push({ ...n, id: `n-${rows.length + 1}`, status: 'pending', attempts: 0, lastError: null })
      return fresh.length
    },
    async listPendingDeliveries(limit) {
      return rows
        .filter((r) => r.status === 'pending')
        .slice(0, limit)
        .map((r) => ({ id: r.id, phone_number: STUDENT_PHONE, title: r.title, body: r.body, delivery_attempts: r.attempts }))
    },
    async markSent(id) {
      const row = rows.find((r) => r.id === id)!
      row.status = 'sent'
      row.attempts += 1
    },
    async markDeliveryFailed(id, error, giveUp) {
      const row = rows.find((r) => r.id === id)!
      row.status = giveUp ? 'failed' : 'pending'
      row.attempts += 1
      row.lastError = error
    },
    async listForUser() {
      return []
    },
    async countUnread() {
      return 0
    },
    async markRead() {
      return false
    },
    async markAllRead() {},
  }
  return store
}

const RETAKE: RetakeCandidateRow = {
  attempt_id: 'attempt-1',
  student_id: 'student-1',
  exam_title: 'Starter Reading',
  attempt_number: 1,
  max_attempts: 3,
  closes_at: new Date('2026-11-20T10:30:00Z'),
}
const SESSION: SessionCandidateRow = {
  session_id: 'session-1',
  teacher_id: 'teacher-1',
  class_name: 'Starter A',
  session_date: '2026-11-12',
  starts_at: '18:00',
}

function makeSender(failures = 0): NotificationSender & { sent: string[] } {
  let remainingFailures = failures
  const sent: string[] = []
  return {
    channel: 'console',
    sent,
    async send({ phoneNumber, text }) {
      if (remainingFailures > 0) {
        remainingFailures -= 1
        throw new Error('provider down')
      }
      sent.push(`${phoneNumber}: ${text}`)
    },
  }
}

describe('reminder runner', () => {
  it('enqueues one retake and one teaching reminder, delivers them, and never duplicates on the next scan', async () => {
    const store = makeFakeStore([RETAKE], [SESSION])
    const sender = makeSender()
    const runner = makeReminderRunner(store, sender)

    expect(await runner.run(NOW)).toEqual({ created: 2, sent: 2, failed: 0 })
    expect(store.sessionWindow).toEqual({ from: NOW, to: new Date('2026-11-12T03:00:00Z') })
    expect(store.rows.map((r) => [r.userId, r.kind, r.dedupeKey, r.title])).toEqual([
      ['student-1', 'retake_reminder', 'retake:attempt-1', 'Được thi lại: Starter Reading'],
      ['teacher-1', 'session_reminder', 'session:session-1:teacher-1', 'Lịch dạy: Starter A'],
    ])
    expect(store.rows[0]?.body).toBe('Bạn có thể thi lại lần 2/3. Hạn chót: 17:30 20/11/2026.')
    expect(store.rows[1]?.body).toBe('Buổi học lúc 18:00 ngày 12/11/2026.')
    expect(sender.sent).toHaveLength(2)

    expect(await runner.run(NOW)).toEqual({ created: 0, sent: 0, failed: 0 })
    expect(sender.sent).toHaveLength(2)
  })

  it('keeps a failed delivery pending for a retry and gives up after the attempt limit', async () => {
    const store = makeFakeStore([RETAKE], [])
    const runner = makeReminderRunner(store, makeSender(MAX_DELIVERY_ATTEMPTS))

    expect(await runner.run(NOW)).toEqual({ created: 1, sent: 0, failed: 1 })
    expect(store.rows[0]).toMatchObject({ status: 'pending', attempts: 1, lastError: 'provider down' })
    for (let i = 1; i < MAX_DELIVERY_ATTEMPTS; i += 1) await runner.run(NOW)
    expect(store.rows[0]).toMatchObject({ status: 'failed', attempts: 3 })
    expect(await runner.run(NOW)).toEqual({ created: 0, sent: 0, failed: 0 })
  })

  it('formats Vietnamese local phone numbers for WhatsApp', () => {
    expect(toE164('0933 000 001')).toBe('84933000001')
    expect(toE164('+84933000001')).toBe('84933000001')
  })
})
