import { test, expect } from '@playwright/test'
import { createQuestion, gotoQuestions, rowByText, uniq } from './support/questions'

test.describe('Questions — create, validate, delete', () => {
  test.beforeEach(async ({ page }) => {
    await gotoQuestions(page)
  })

  test('creates a question and shows it in the list', async ({ page }) => {
    const text = uniq('E2E create')
    await createQuestion(page, {
      level: 'starter',
      skill: 'reading',
      type: 'fill_blank',
      difficulty: 'easy',
      text,
      correctAnswer: 'answer',
      points: '1',
      explanation: 'An explanation',
      sourceReference: 'A source',
    })
    await expect(rowByText(page, text)).toContainText('starter')
    await expect(rowByText(page, text)).toContainText('reading')
  })

  test('shows a validation error and does not create on invalid input', async ({ page }) => {
    // Empty question text / answer should fail client-side Zod (CreateQuestionRequest).
    await page.getByLabel('Nội dung câu hỏi').fill('')
    await page.getByLabel('Đáp án đúng').fill('')
    await page.getByRole('button', { name: 'Thêm câu hỏi', exact: true }).click()
    await expect(page.getByRole('alert')).toBeVisible()
  })

  test('deletes a question', async ({ page }) => {
    const text = uniq('E2E delete')
    await createQuestion(page, {
      level: 'mover',
      skill: 'listening',
      type: 'multiple_choice',
      difficulty: 'medium',
      text,
      options: 'A|B|C',
      correctAnswer: 'B',
      points: '2',
    })
    const row = rowByText(page, text)
    await expect(row).toBeVisible()
    await row.getByRole('button', { name: /xo[áa]/i }).click()
    await expect(rowByText(page, text)).toHaveCount(0)
  })
})
