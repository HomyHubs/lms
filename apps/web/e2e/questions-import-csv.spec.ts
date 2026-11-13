import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { test, expect } from '@playwright/test'
import { gotoQuestions, rowByText } from './support/questions'

const FIXTURES = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures')
const fileInput = 'input[aria-label="Chọn file CSV"]'

test.describe('Questions — strict CSV import', () => {
  test.beforeEach(async ({ page }) => {
    await gotoQuestions(page)
  })

  test('imports a valid 10-column CSV and shows a success message', async ({ page }) => {
    await page.locator(fileInput).setInputFiles(path.join(FIXTURES, 'questions-valid.csv'))
    // Scope to the import success paragraph by text (the AppShell DB badge also
    // uses text-success-700, so a bare class locator would be ambiguous).
    await expect(page.getByText(/Đã import 2 câu hỏi/i)).toBeVisible()
    await expect(rowByText(page, 'E2E valid question one')).toBeVisible()
    await expect(rowByText(page, 'E2E valid question two')).toBeVisible()
  })

  test('rejects a CSV with a wrong header column (row 1 header error)', async ({ page }) => {
    await page.locator(fileInput).setInputFiles(path.join(FIXTURES, 'questions-bad-header.csv'))
    const alert = page.getByRole('alert')
    await expect(alert).toBeVisible()
    await expect(alert).toContainText('header')
    // Nothing from this malformed file should appear in the list.
    await expect(rowByText(page, 'Header mismatch row')).toHaveCount(0)
  })

  test('rejects a CSV row with an extra cell, preserving row/field in the error', async ({
    page,
  }) => {
    await page.locator(fileInput).setInputFiles(path.join(FIXTURES, 'questions-extra-cell.csv'))
    const alert = page.getByRole('alert')
    await expect(alert).toBeVisible()
    // Client-side parse error is reported against the data row (row 2) and the
    // "columns" field, rendered as "Dòng 2 / columns: Số ô không khớp header".
    await expect(alert).toContainText(/Dòng 2/i)
    await expect(alert).toContainText('columns')
    await expect(rowByText(page, 'Row with an extra trailing cell')).toHaveCount(0)
  })
})
