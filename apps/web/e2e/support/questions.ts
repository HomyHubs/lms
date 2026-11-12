import { expect, type Page, type Locator } from '@playwright/test'

/** Shared helpers + selectors for the Questions page specs. */

export async function gotoQuestions(page: Page): Promise<void> {
  await page.goto('/questions')
  await expect(page.getByRole('heading', { name: /ngân hàng câu hỏi/i })).toBeVisible()
}

/** The data row(s) of the "Danh sách câu hỏi" table (excludes the header row). */
export function questionRows(page: Page): Locator {
  return page.locator('table.c-table tbody tr')
}

/** First table row whose question-text cell contains `text`. */
export function rowByText(page: Page, text: string): Locator {
  return questionRows(page).filter({ hasText: text })
}

/**
 * Create a question via the "Thêm câu hỏi" form. Returns the question text used
 * (callers typically pass a unique string so they can find the row afterwards).
 */
export async function createQuestion(
  page: Page,
  fields: {
    level?: string
    skill?: string
    type?: string
    difficulty?: string
    text: string
    options?: string
    correctAnswer: string
    points?: string
    explanation?: string
    sourceReference?: string
  },
): Promise<string> {
  if (fields.level) await page.getByLabel('Cấp độ', { exact: true }).selectOption(fields.level)
  if (fields.skill) await page.getByLabel('Kỹ năng', { exact: true }).selectOption(fields.skill)
  if (fields.type) await page.getByLabel('Loại câu hỏi', { exact: true }).selectOption(fields.type)
  if (fields.difficulty)
    await page.getByLabel('Độ khó', { exact: true }).selectOption(fields.difficulty)
  await page.getByLabel('Nội dung câu hỏi').fill(fields.text)
  if (fields.options !== undefined) await page.getByLabel('Lựa chọn').fill(fields.options)
  await page.getByLabel('Đáp án đúng').fill(fields.correctAnswer)
  if (fields.points !== undefined) await page.getByLabel('Điểm').fill(fields.points)
  if (fields.explanation !== undefined)
    await page.getByLabel('Giải thích').fill(fields.explanation)
  if (fields.sourceReference !== undefined)
    await page.getByLabel('Nguồn tham khảo').fill(fields.sourceReference)

  await page.getByRole('button', { name: 'Thêm câu hỏi', exact: true }).click()
  await expect(rowByText(page, fields.text)).toBeVisible()
  return fields.text
}

/** A short unique suffix so parallel-safe, repeatable runs don't collide. */
export function uniq(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1e4)}`
}
