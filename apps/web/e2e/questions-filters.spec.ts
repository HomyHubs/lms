import { test, expect } from '@playwright/test'
import { createQuestion, gotoQuestions, questionRows, rowByText, uniq } from './support/questions'

test.describe('Questions — client-side list filters', () => {
  test('filters the already-loaded list without a new GET /questions', async ({ page }) => {
    await gotoQuestions(page)

    // Seed two rows that differ by level + skill so a filter can separate them.
    const starter = uniq('E2E filter starter')
    const flyer = uniq('E2E filter flyer')
    await createQuestion(page, {
      level: 'starter',
      skill: 'reading',
      type: 'fill_blank',
      difficulty: 'easy',
      text: starter,
      correctAnswer: 'a',
      points: '1',
    })
    await createQuestion(page, {
      level: 'flyer',
      skill: 'speaking',
      type: 'matching',
      difficulty: 'hard',
      text: flyer,
      correctAnswer: 'b',
      points: '1',
    })

    // Count GET /questions calls AFTER the list is already loaded.
    let listGets = 0
    page.on('request', (req) => {
      if (req.method() === 'GET' && /\/questions(\?|$)/.test(new URL(req.url()).pathname)) {
        listGets++
      }
    })

    // slice-18: each level now has its own panel; filtering is per-column INSIDE a
    // panel. The flyer row lives in the Flyer panel (skill=speaking); narrowing that
    // panel's skill filter to 'reading' hides it. The Starter panel is independent.
    await page.getByLabel('Lọc kỹ năng Flyer', { exact: true }).selectOption('reading')
    await expect(rowByText(page, flyer)).toHaveCount(0)
    await expect(rowByText(page, starter)).toBeVisible()

    // Resetting the panel filter restores the flyer row.
    await page.getByLabel('Lọc kỹ năng Flyer', { exact: true }).selectOption('')
    await expect(rowByText(page, starter)).toBeVisible()
    await expect(rowByText(page, flyer)).toBeVisible()

    // Contract: filtering is purely client-side — no extra list fetch happened.
    expect(listGets).toBe(0)
    await expect(questionRows(page).first()).toBeVisible()
  })
})
