import { describe, expect, it } from 'vitest'
import type {
  AttemptRow,
  CreateAttemptFields,
  CreateExamFields,
  ExamRow,
  ExamsStore,
  GradingPolicyRow,
  LevelRef,
  QuestionLite,
} from './service.js'
import {
  createExam,
  generatePaper,
  getAttempt,
  gradeAttempt,
  listAttemptHistory,
  listExams,
  listGradingPolicies,
  listOpenExams,
  startAttempt,
  submitAttempt,
  saveAttemptAnswers,
  updateGradingPolicy,
} from './service.js'

const LEVELS: LevelRef[] = [
  { id: 'lvl-starter', code: 'starter' },
  { id: 'lvl-mover', code: 'mover' },
  { id: 'lvl-flyer', code: 'flyer' },
]

interface SeedQuestion extends QuestionLite {
  level_id: string
}

/** Store gia lap trong bo nho — test logic ma khong can Postgres. */
function makeFakeStore(
  seed: { questions?: SeedQuestion[]; exams?: ExamRow[]; policies?: GradingPolicyRow[] } = {},
): ExamsStore {
  const questions: SeedQuestion[] = seed.questions ? [...seed.questions] : []
  const exams: ExamRow[] = seed.exams ? [...seed.exams] : []
  const attempts: AttemptRow[] = []
  const policies: GradingPolicyRow[] = seed.policies ? [...seed.policies] : []
  let examSeq = 0
  let attemptSeq = 0

  return {
    async findLevelByCode(code) {
      return LEVELS.find((l) => l.code === code)
    },
    async createExam(input: CreateExamFields) {
      const level = LEVELS.find((l) => l.id === input.levelId)
      const row: ExamRow = {
        id: `exam-${(examSeq += 1)}`,
        title: input.title,
        level_id: input.levelId,
        level_code: level?.code ?? 'starter',
        skill: input.skill,
        question_count: input.questionCount,
        duration_minutes: input.durationMinutes,
        opens_at: input.opensAt,
        closes_at: input.closesAt,
        pass_percent: input.passPercent,
        max_attempts: input.maxAttempts,
        retake_cooldown_minutes: input.retakeCooldownMinutes,
        created_by: input.createdBy,
        created_at: new Date('2026-09-21T00:00:00.000Z'),
      }
      exams.push(row)
      return row
    },
    async listExams() {
      return [...exams]
    },
    async findExamById(id) {
      return exams.find((e) => e.id === id)
    },
    async listQuestionIdsFor(levelId, skill) {
      return questions.filter((q) => q.level_id === levelId && q.skill === skill).map((q) => q.id)
    },
    async findQuestionsByIds(ids) {
      // Nhu store that: kem dap an dung de dong bang vao snapshot (view hoc vien loc bo).
      return questions
        .filter((q) => ids.includes(q.id))
        .map(({ id, question_text, question_type, skill, points, options, correct_answer }) => ({
          id,
          question_text,
          question_type,
          skill,
          points,
          options,
          correct_answer,
        }))
    },
    async findAttempt(examId, studentId) {
      return attempts
        .filter((a) => a.exam_id === examId && a.student_id === studentId)
        .sort((a, b) => (b.attempt_number ?? 1) - (a.attempt_number ?? 1))[0]
    },
    async listAttempts(examId, studentId) {
      return attempts
        .filter((a) => a.exam_id === examId && (studentId === undefined || a.student_id === studentId))
        .sort((a, b) => a.student_id.localeCompare(b.student_id) || (a.attempt_number ?? 1) - (b.attempt_number ?? 1))
    },
    async findLatestAttemptForStudent(studentId) {
      const mine = attempts
        .filter((a) => a.student_id === studentId)
        .sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime())
      return mine[0]
    },
    async createAttempt(input: CreateAttemptFields) {
      const row: AttemptRow = {
        id: `attempt-${(attemptSeq += 1)}`,
        exam_id: input.examId,
        student_id: input.studentId,
        question_ids: JSON.stringify(input.questionIds),
        question_snapshot: JSON.stringify(input.questionSnapshot),
        attempt_number: input.attemptNumber,
        session_key: input.sessionKey,
        answer_revision: 0,
        answers: null,
        started_at: input.startedAt,
        deadline_at: input.deadlineAt,
        submitted_at: null,
      }
      attempts.push(row)
      return row
    },
    async claimSession(id, key) {
      const row = attempts.find((a) => a.id === id)!
      if (row.session_key && row.session_key !== key) return false
      row.session_key = key
      return true
    },
    async saveAnswers(id, answers, revision, now) {
      const row = attempts.find((a) => a.id === id)!
      if (row.submitted_at !== null) return row
      if (Date.parse(now) >= new Date(row.deadline_at).getTime()) { row.submitted_at = row.deadline_at; return row }
      if ((row.answer_revision ?? 0) !== revision) return undefined
      row.answers = answers
      row.answer_revision = revision + 1
      return row
    },
    async saveSubmission(attemptId, answersJson, submittedAtIso) {
      const row = attempts.find((a) => a.id === attemptId)
      if (!row) throw new Error('attempt not found')
      if (row.submitted_at !== null) return row
      const late = Date.parse(submittedAtIso) >= new Date(row.deadline_at).getTime()
      if (!late) row.answers = answersJson
      row.submitted_at = late ? row.deadline_at : submittedAtIso
      return row
    },
    async saveGrade(attemptId, grade) {
      const row = attempts.find((a) => a.id === attemptId)!
      if (row.submitted_at === null || row.graded_at) return row
      Object.assign(row, {
        score: grade.score,
        max_score: grade.maxScore,
        passed: grade.passed,
        graded_at: grade.gradedAt,
        grading_detail: grade.detailJson,
      })
      return row
    },
    async findGradingPolicy(levelId) {
      return policies.find((p) => p.level_id === levelId)
    },
    async listGradingPolicies() {
      return [...policies]
    },
    async upsertGradingPolicy(levelId, fields) {
      const level = LEVELS.find((l) => l.id === levelId)!
      const row: GradingPolicyRow = {
        level_id: levelId,
        level_code: level.code,
        pass_percent: fields.passPercent,
        max_attempts: fields.maxAttempts,
        retake_cooldown_minutes: fields.retakeCooldownMinutes,
      }
      const index = policies.findIndex((p) => p.level_id === levelId)
      if (index >= 0) policies[index] = row
      else policies.push(row)
      return row
    },
  }
}

function q(id: string, levelId: string, skill: string): SeedQuestion {
  return {
    id,
    level_id: levelId,
    skill,
    question_text: `Q ${id}`,
    question_type: 'multiple_choice',
    points: 1,
    options: JSON.stringify(['a', 'b']),
    correct_answer: 'a',
  }
}

function openExam(overrides: Partial<ExamRow> = {}): ExamRow {
  return {
    id: 'exam-open',
    title: 'Reading Starter',
    level_id: 'lvl-starter',
    level_code: 'starter',
    skill: 'reading',
    question_count: 2,
    duration_minutes: 30,
    opens_at: '2026-09-21T09:00:00.000Z',
    closes_at: '2026-09-21T12:00:00.000Z',
    pass_percent: 50,
    max_attempts: 3,
    retake_cooldown_minutes: 0,
    created_by: 'teacher-1',
    created_at: '2026-09-21T08:00:00.000Z',
    ...overrides,
  }
}

const NOW = new Date('2026-09-21T10:00:00.000Z')

describe('generatePaper — sinh de ngau nhien, khong trung lien tiep', () => {
  it('rut dung so cau, khong trung lap, deu tu pool', () => {
    const pool = ['a', 'b', 'c', 'd', 'e']
    const paper = generatePaper(pool, 3, null)
    expect(paper).toHaveLength(3)
    expect(new Set(paper).size).toBe(3)
    expect(paper!.every((id) => pool.includes(id))).toBe(true)
  })

  it('rut lai khi trung y het de gan nhat (con to hop khac)', () => {
    // rng theo hang doi: lan rut 1 -> {a,b}=previous; lan rut 2 -> {c,d} (khac).
    const queue = [0.1, 0.2, 0.8, 0.9, 0.9, 0.8, 0.1, 0.2]
    let i = 0
    const rng = (): number => (i < queue.length ? (queue[i++] as number) : 0)
    const paper = generatePaper(['a', 'b', 'c', 'd'], 2, ['a', 'b'], rng)
    expect([...paper!].sort()).not.toEqual(['a', 'b'])
    expect(new Set(paper).size).toBe(2)
  })

  it('reports impossible rather than repeating the only combination', () => {
    expect(generatePaper(['a', 'b'], 2, ['a', 'b'])).toBeNull()
  })

  it('guarantees no repeat even with constant random and duplicate content variants', () => {
    expect(generatePaper(['a', 'b', 'c'], 2, ['a', 'b'], () => 0)).toEqual(['a', 'c'])
    const variants = new Map([['a', 'same'], ['b', 'same'], ['c', 'other']])
    expect(generatePaper(['a', 'b'], 1, ['a'], () => 0, variants)).toBeNull()
    expect(generatePaper(['a', 'b', 'c'], 2, null, () => 0, variants)).toEqual(['b', 'c'])
  })
})

describe('createExam', () => {
  it('tao de khi cap do hop le', async () => {
    const store = makeFakeStore()
    const out = await createExam(
      store,
      {
        title: 'Reading Starter',
        level: 'starter',
        skill: 'reading',
        questionCount: 2,
        durationMinutes: 30,
        opensAt: '2026-09-21T09:00:00.000Z',
        closesAt: '2026-09-21T12:00:00.000Z',
      },
      'teacher-1',
    )
    expect(out.ok).toBe(true)
    if (!out.ok) return
    expect(out.exam.levelCode).toBe('starter')
    expect(out.exam.createdBy).toBe('teacher-1')
  })

  it('tu choi khi cap do khong ton tai', async () => {
    const store: ExamsStore = { ...makeFakeStore(), findLevelByCode: async () => undefined }
    const out = await createExam(
      store,
      {
        title: 'X',
        level: 'starter',
        skill: 'reading',
        questionCount: 1,
        durationMinutes: 10,
        opensAt: '2026-09-21T09:00:00.000Z',
        closesAt: '2026-09-21T12:00:00.000Z',
      },
      'teacher-1',
    )
    expect(out).toEqual({ ok: false, reason: 'level_not_found' })
  })
})

describe('listExams / listOpenExams — loc theo vai tro (N002)', () => {
  const openWindow = openExam({ id: 'exam-open' }) // 09:00..12:00, NOW=10:00 -> dang mo
  const future = openExam({
    id: 'exam-future',
    opens_at: '2026-09-21T11:00:00.000Z',
    closes_at: '2026-09-21T13:00:00.000Z',
  })
  const closed = openExam({
    id: 'exam-closed',
    opens_at: '2026-09-21T07:00:00.000Z',
    closes_at: '2026-09-21T09:30:00.000Z',
  })

  it('listOpenExams chi tra de trong cua so lich (bo chua mo / da dong)', async () => {
    const store = makeFakeStore({ exams: [openWindow, future, closed] })
    const open = await listOpenExams(store, NOW)
    expect(open.map((e) => e.id)).toEqual(['exam-open'])
  })

  it('listExams (quan tri) tra toan bo de', async () => {
    const store = makeFakeStore({ exams: [openWindow, future, closed] })
    const all = await listExams(store)
    expect(all.map((e) => e.id).sort()).toEqual(['exam-closed', 'exam-future', 'exam-open'])
  })
})

describe('startAttempt — sinh de, lich thi, resume', () => {
  function seeded(exam: ExamRow = openExam()): ExamsStore {
    return makeFakeStore({
      exams: [exam],
      questions: [
        q('q1', 'lvl-starter', 'reading'),
        q('q2', 'lvl-starter', 'reading'),
        q('q3', 'lvl-starter', 'reading'),
        q('q4', 'lvl-starter', 'reading'),
      ],
    })
  }

  it('404 khi khong co de', async () => {
    const out = await startAttempt(seeded(), 'nope', 'student-1', NOW)
    expect(out).toEqual({ ok: false, reason: 'not_found' })
  })

  it('chan khi chua mo / da dong', async () => {
    const early = await startAttempt(seeded(), 'exam-open', 's', new Date('2026-09-21T08:00:00Z'))
    expect(early).toEqual({ ok: false, reason: 'not_open' })
    const late = await startAttempt(seeded(), 'exam-open', 's', new Date('2026-09-21T13:00:00Z'))
    expect(late).toEqual({ ok: false, reason: 'closed' })
  })

  it('tao luot thi voi de an dap an, deadline = start + duration', async () => {
    const out = await startAttempt(seeded(), 'exam-open', 'student-1', NOW)
    expect(out.ok).toBe(true)
    if (!out.ok) return
    expect(out.attempt.questions).toHaveLength(2)
    // Bao mat: view cau hoi KHONG co correctAnswer/explanation.
    for (const question of out.attempt.questions) {
      expect(Object.keys(question)).not.toContain('correctAnswer')
      expect(Object.keys(question)).not.toContain('explanation')
    }
    expect(out.attempt.status).toBe('in_progress')
    expect(out.attempt.deadlineAt).toBe('2026-09-21T10:30:00.000Z')
  })

  it('goi lai tra ve dung luot cu (resume, khong sinh de moi)', async () => {
    const store = seeded()
    const first = await startAttempt(store, 'exam-open', 'student-1', NOW)
    const second = await startAttempt(
      store,
      'exam-open',
      'student-1',
      new Date('2026-09-21T10:05:00Z'),
    )
    expect(first.ok && second.ok).toBe(true)
    if (!first.ok || !second.ok) return
    expect(second.attempt.startedAt).toBe(first.attempt.startedAt)
    expect(second.attempt.questions.map((x) => x.id)).toEqual(
      first.attempt.questions.map((x) => x.id),
    )
  })

  it('not_enough_questions khi ngan hang thieu cau', async () => {
    const store = makeFakeStore({
      exams: [openExam({ question_count: 5 })],
      questions: [q('q1', 'lvl-starter', 'reading'), q('q2', 'lvl-starter', 'reading')],
    })
    const out = await startAttempt(store, 'exam-open', 'student-1', NOW)
    expect(out).toEqual({ ok: false, reason: 'not_enough_questions' })
  })

  it('resume khi insert dua nhau (vi pham unique) thay vi loi 500', async () => {
    // Mo phong dua: findAttempt lan dau chua thay luot nao, nhung createAttempt vi pham
    // unique(exam_id, student_id) vi request song song da chen truoc; luc do luot cua
    // request kia da nam trong "DB" -> phai doc lai va resume, khong de loi lot ra.
    const base = seeded()
    let raced: AttemptRow | undefined
    const store: ExamsStore = {
      ...base,
      findAttempt: async () => raced,
      claimSession: async (_id, key) => raced?.session_key === key,
      createAttempt: async (input) => {
        raced = {
          id: 'attempt-raced',
          exam_id: input.examId,
          student_id: input.studentId,
          question_ids: JSON.stringify(input.questionIds),
          question_snapshot: JSON.stringify(input.questionSnapshot),
          session_key: input.sessionKey,
          answers: null,
          started_at: input.startedAt,
          deadline_at: input.deadlineAt,
          submitted_at: null,
        }
        throw new Error('duplicate key value violates unique constraint')
      },
    }
    const out = await startAttempt(store, 'exam-open', 'student-1', NOW)
    expect(out.ok).toBe(true)
    if (!out.ok) return
    expect(out.attempt.status).toBe('in_progress')
    expect(out.attempt.questions).toHaveLength(2)
  })

  it('bao loi thuc khi createAttempt that bai va khong co luot nao ton tai', async () => {
    // Loi that (khong phai dua): createAttempt loi va findAttempt van khong thay gi ->
    // khong duoc nuot loi, phai nem ra ngoai.
    const base = seeded()
    const store: ExamsStore = {
      ...base,
      findAttempt: async () => undefined,
      createAttempt: async () => {
        throw new Error('db down')
      },
    }
    await expect(startAttempt(store, 'exam-open', 'student-1', NOW)).rejects.toThrow('db down')
  })
})

describe('submitAttempt — nop 1 lan, het gio thi ep nop', () => {
  function seeded(): ExamsStore {
    return makeFakeStore({
      exams: [openExam()],
      questions: [
        q('q1', 'lvl-starter', 'reading'),
        q('q2', 'lvl-starter', 'reading'),
        q('q3', 'lvl-starter', 'reading'),
      ],
    })
  }

  it('not_started khi chua bat dau', async () => {
    const out = await submitAttempt(seeded(), 'exam-open', 'student-1', {}, NOW)
    expect(out).toEqual({ ok: false, reason: 'not_started' })
  })

  it('nop thanh cong roi khong the nop/lam lai', async () => {
    const store = seeded()
    const started = await startAttempt(store, 'exam-open', 'student-1', NOW)
    expect(started.ok).toBe(true)
    if (!started.ok) return
    const firstQid = started.attempt.questions[0]?.id ?? ''
    const submitted = await submitAttempt(
      store,
      'exam-open',
      'student-1',
      { [firstQid]: 'a', 'khong-thuoc-de': 'x' },
      new Date('2026-09-21T10:10:00Z'),
    )
    expect(submitted.ok).toBe(true)
    if (!submitted.ok) return
    expect(submitted.attempt.status).toBe('submitted')
    expect(submitted.attempt.submittedAt).toBe('2026-09-21T10:10:00.000Z')
    // Chi giu dap an cho cau thuoc de.
    expect(submitted.attempt.answers).toEqual({ [firstQid]: 'a' })

    // Nop lan hai -> chan.
    const again = await submitAttempt(
      store,
      'exam-open',
      'student-1',
      {},
      new Date('2026-09-21T10:11:00Z'),
    )
    expect(again).toEqual(submitted)
    // 1/2 cau dung = 50% >= nguong 50% -> dat; vao lai (start) khong lam lai duoc.
    expect(submitted.attempt.result).toMatchObject({ status: 'graded', score: 1, maxScore: 2, passed: true })
    const restart = await startAttempt(
      store,
      'exam-open',
      'student-1',
      new Date('2026-09-21T10:12:00Z'),
    )
    expect(restart).toEqual({ ok: false, reason: 'already_passed' })
  })

  it('qua deadline van cho nop (ep nop) — chi tinh cac cau da lam', async () => {
    const store = seeded()
    const started = await startAttempt(store, 'exam-open', 'student-1', NOW) // deadline 10:30
    expect(started.ok).toBe(true)
    if (!started.ok) return
    const firstQid = started.attempt.questions[0]?.id ?? ''
    await saveAttemptAnswers(store, 'exam-open', 'student-1', { [firstQid]: 'saved' }, 0,
      new Date('2026-09-21T10:29:59Z'), 'internal')
    // The late request must not replace the checkpoint.
    const out = await submitAttempt(
      store,
      'exam-open',
      'student-1',
      { [firstQid]: 'a' },
      new Date('2026-09-21T10:31:00Z'),
    )
    expect(out.ok).toBe(true)
    if (!out.ok) return
    expect(out.attempt.status).toBe('submitted')
    expect(out.attempt.submittedAt).toBe('2026-09-21T10:30:00.000Z')
    expect(out.attempt.answers).toEqual({ [firstQid]: 'saved' })
  })

  it('getAttempt tra ve trang thai luot hien tai', async () => {
    const store = seeded()
    await startAttempt(store, 'exam-open', 'student-1', NOW)
    const got = await getAttempt(store, 'exam-open', 'student-1', NOW)
    expect(got.ok).toBe(true)
    if (!got.ok) return
    expect(got.attempt.status).toBe('in_progress')
    expect(got.attempt.questions).toHaveLength(2)
  })
})

describe('gradeAttempt — cham tu dong tu snapshot', () => {
  const mc: QuestionLite = {
    id: 'mc', question_text: 'Pick', question_type: 'multiple_choice', skill: 'reading',
    points: 2, options: JSON.stringify(['Red apple', 'Blue sky']), correct_answer: 'B',
  }
  const blank: QuestionLite = {
    id: 'fb', question_text: 'Fill', question_type: 'fill_blank', skill: 'reading',
    points: 3, options: null, correct_answer: 'colour|color',
  }

  it('chap nhan chu cai hoac noi dung lua chon, nhieu dap an dien khuyet, bo qua hoa thuong/khoang trang', () => {
    expect(gradeAttempt([mc, blank], { mc: '  blue   SKY ', fb: 'Color' }, 50)).toMatchObject({
      score: 5, maxScore: 5, passed: true,
    })
    expect(gradeAttempt([mc, blank], { mc: 'b', fb: 'colours' }, 50).score).toBe(2)
    expect(gradeAttempt([mc, blank], { mc: 'Red apple' }, 50).score).toBe(0)
  })

  it('dat khi diem dung bang nguong, truot khi duoi nguong', () => {
    expect(gradeAttempt([mc, blank], { fb: 'color' }, 60).passed).toBe(true) // 3/5 = 60%
    expect(gradeAttempt([mc, blank], { fb: 'color' }, 61).passed).toBe(false)
  })
})

describe('cham diem & thi lai', () => {
  function seeded(exam: Partial<ExamRow> = {}, skill = 'reading'): ExamsStore {
    return makeFakeStore({
      exams: [openExam({ skill, ...exam })],
      questions: ['q1', 'q2', 'q3', 'q4'].map((id) => q(id, 'lvl-starter', skill)),
    })
  }
  const first = () => 0
  const at = (time: string) => new Date(`2026-09-21T${time}:00.000Z`)

  async function sitAndSubmit(store: ExamsStore, answer: string | null, start: string, submit: string) {
    const started = await startAttempt(store, 'exam-open', 'student-1', at(start), first)
    if (!started.ok) throw new Error(started.reason)
    const answers = answer === null ? {} : Object.fromEntries(started.attempt.questions.map((x) => [x.id, answer]))
    const out = await submitAttempt(store, 'exam-open', 'student-1', answers, at(submit))
    if (!out.ok) throw new Error(out.reason)
    return { started: started.attempt, submitted: out.attempt }
  }

  it('truot -> thi lai voi de khac; dat o lan 2 -> bao dat, khong cho thi lai nua', async () => {
    const store = seeded()
    const one = await sitAndSubmit(store, 'b', '10:00', '10:10')
    expect(one.submitted.result).toMatchObject({ status: 'graded', score: 0, maxScore: 2, passed: false })
    expect(one.submitted.retake).toMatchObject({ available: true, reason: 'retake_ready', nextAttemptNumber: 2 })

    const two = await sitAndSubmit(store, 'a', '10:11', '10:20')
    expect(two.started.attemptNumber).toBe(2)
    expect(two.started.questions.map((x) => x.id)).not.toEqual(one.started.questions.map((x) => x.id))
    expect(two.submitted.result).toMatchObject({ score: 2, passed: true })
    expect(two.submitted.retake).toMatchObject({ available: false, reason: 'passed' })
    expect(await startAttempt(store, 'exam-open', 'student-1', at('10:21'), first)).toEqual({ ok: false, reason: 'already_passed' })

    const history = await listAttemptHistory(store, 'exam-open', 'student-1', at('10:22'))
    expect(history.ok && history.attempts.map((a) => [a.attemptNumber, a.result?.passed])).toEqual([[1, false], [2, true]])
  })

  it('het so lan thi -> retake_limit_reached', async () => {
    const store = seeded({ max_attempts: 2 })
    await sitAndSubmit(store, null, '10:00', '10:05')
    const two = await sitAndSubmit(store, null, '10:06', '10:10')
    expect(two.submitted.retake).toMatchObject({ available: false, reason: 'limit_reached', attemptsUsed: 2 })
    expect(await startAttempt(store, 'exam-open', 'student-1', at('10:11'), first))
      .toEqual({ ok: false, reason: 'retake_limit_reached' })
  })

  it('chua het thoi gian cho -> retake_cooldown; het cho -> duoc thi lai', async () => {
    const store = seeded({ retake_cooldown_minutes: 30 })
    const one = await sitAndSubmit(store, null, '10:00', '10:10')
    expect(one.submitted.retake?.availableAt).toBe('2026-09-21T10:40:00.000Z')
    expect(await startAttempt(store, 'exam-open', 'student-1', at('10:39'), first))
      .toEqual({ ok: false, reason: 'retake_cooldown' })
    const retry = await startAttempt(store, 'exam-open', 'student-1', at('10:40'), first)
    expect(retry.ok && retry.attempt.attemptNumber).toBe(2)
  })

  it('Speaking/Writing cho cham tay: khong tu cham, khong mo thi lai', async () => {
    const store = seeded({}, 'speaking')
    const one = await sitAndSubmit(store, 'a', '10:00', '10:10')
    expect(one.submitted.result).toMatchObject({ status: 'pending_manual', score: null, passed: null })
    expect(one.submitted.retake).toMatchObject({ available: false, reason: 'pending_manual' })
    expect(await startAttempt(store, 'exam-open', 'student-1', at('10:11'), first))
      .toEqual({ ok: false, reason: 'already_submitted' })
  })
})

describe('chinh sach cham theo cap do', () => {
  const blueprint = {
    title: 'Reading Starter', level: 'starter' as const, skill: 'reading' as const, questionCount: 2,
    durationMinutes: 30, opensAt: '2026-09-21T09:00:00.000Z', closesAt: '2026-09-21T12:00:00.000Z',
  }

  it('de moi chot nguong tu chinh sach cap do; gia tri nhap tay ghi de', async () => {
    const store = makeFakeStore()
    await updateGradingPolicy(store, 'starter', { passPercent: 70, maxAttempts: 2, retakeCooldownMinutes: 15 })
    const inherited = await createExam(store, blueprint, 'teacher-1')
    expect(inherited.ok && inherited.exam).toMatchObject({ passPercent: 70, maxAttempts: 2, retakeCooldownMinutes: 15 })
    const overridden = await createExam(store, { ...blueprint, passPercent: 80 }, 'teacher-1')
    expect(overridden.ok && overridden.exam).toMatchObject({ passPercent: 80, maxAttempts: 2 })
    expect(await listGradingPolicies(store)).toEqual([
      { levelCode: 'starter', passPercent: 70, maxAttempts: 2, retakeCooldownMinutes: 15 },
    ])
  })

  it('tu choi cap do khong ton tai', async () => {
    const store: ExamsStore = { ...makeFakeStore(), findLevelByCode: async () => undefined }
    expect(await updateGradingPolicy(store, 'x', { passPercent: 50, maxAttempts: 1, retakeCooldownMinutes: 0 }))
      .toEqual({ ok: false, reason: 'level_not_found' })
  })
})
