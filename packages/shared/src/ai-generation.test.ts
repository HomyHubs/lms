import { describe, expect, it } from 'vitest'
import { buildAiPrompt, CreateAiRequestRequest } from './ai-generation.js'

describe('buildAiPrompt', () => {
  it('pins level/skill/type/count and states every import column', () => {
    const prompt = buildAiPrompt({
      level: 'mover',
      skill: 'reading',
      questionType: 'multiple_choice',
      count: 10,
      samples: [],
    })
    expect(prompt).toContain('Write exactly 10 NEW reading questions for the A1 Movers level.')
    expect(prompt).toContain('"level": always "mover"')
    expect(prompt).toContain('"multiple_choice" for every question')
    expect(prompt).toContain('Return ONLY a JSON array')
    expect(prompt).toContain(
      'level, skill, question_type, difficulty, question_text, options, correct_answer, points, explanation, source_reference',
    )
    expect(prompt).not.toContain('Reference questions')
  })

  it('embeds samples as import rows and appends notes', () => {
    const prompt = buildAiPrompt({
      level: 'starter',
      skill: 'listening',
      count: 3,
      notes: 'Topic: animals',
      samples: [
        {
          question_type: 'true_false',
          difficulty: 'easy',
          question_text: 'A cat can fly.',
          options: ['True', 'False'],
          correct_answer: 'False',
          points: 1,
          explanation: null,
        },
      ],
    })
    expect(prompt).toContain('Reference questions from our bank')
    expect(prompt).toContain('"question_text": "A cat can fly."')
    expect(prompt).not.toContain('"explanation": null')
    expect(prompt).toContain('Additional requirements: Topic: animals')
  })
})

describe('CreateAiRequestRequest', () => {
  it('rejects more than 5 samples and a count above 50', () => {
    const ids = Array.from({ length: 6 }, (_, i) => `00000000-0000-4000-8000-00000000000${i}`)
    const base = { level: 'flyer', skill: 'reading' }
    expect(CreateAiRequestRequest.safeParse({ ...base, count: 5, sampleQuestionIds: ids }).success).toBe(false)
    expect(CreateAiRequestRequest.safeParse({ ...base, count: 51 }).success).toBe(false)
    expect(CreateAiRequestRequest.parse({ ...base, count: '5' })).toMatchObject({ count: 5, sampleQuestionIds: [] })
  })
})
