import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { createQuestion, gotoQuestions, rowByText, uniq } from './support/questions'

const FIXTURES = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures')
const fileInput = 'input[aria-label="Chọn file CSV"]'

/**
 * Accessibility acceptance for /questions. We gate on critical + serious only
 * (WCAG 2.0/2.1 A & AA); moderate/minor are reported but not failed, matching
 * the scope. Scans cover: fresh list, create form, populated edit form, and the
 * CSV-error state (so the error surface is exercised, not just the happy path).
 */
async function scan(page: import('@playwright/test').Page) {
  return new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze()
}

function criticalOrSerious(results: Awaited<ReturnType<typeof scan>>) {
  return results.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious')
}

test.describe('Questions — accessibility (axe)', () => {
  test('list view has no critical/serious violations', async ({ page }) => {
    await gotoQuestions(page)
    const results = await scan(page)
    expect(criticalOrSerious(results), JSON.stringify(criticalOrSerious(results), null, 2)).toEqual(
      [],
    )
  })

  test('populated edit form has no critical/serious violations', async ({ page }) => {
    await gotoQuestions(page)
    const text = uniq('E2E axe edit')
    await createQuestion(page, {
      level: 'starter',
      skill: 'reading',
      type: 'fill_blank',
      difficulty: 'easy',
      text,
      correctAnswer: 'a',
      points: '1',
      explanation: 'x',
      sourceReference: 'y',
    })
    await rowByText(page, text).getByRole('button', { name: 'Sửa', exact: true }).click()
    await expect(page.getByRole('button', { name: 'Lưu thay đổi', exact: true })).toBeVisible()
    const results = await scan(page)
    expect(criticalOrSerious(results), JSON.stringify(criticalOrSerious(results), null, 2)).toEqual(
      [],
    )
  })

  test('CSV import error state has no critical/serious violations', async ({ page }) => {
    await gotoQuestions(page)
    await page.locator(fileInput).setInputFiles(path.join(FIXTURES, 'questions-bad-header.csv'))
    await expect(page.getByRole('alert')).toBeVisible()
    const results = await scan(page)
    expect(criticalOrSerious(results), JSON.stringify(criticalOrSerious(results), null, 2)).toEqual(
      [],
    )
  })
})
