import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { test, expect } from '@playwright/test'
import { gotoQuestions, rowByText } from './support/questions'

// Generated at global-setup time (see support/make-fixtures.ts).
const GENERATED = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  'fixtures',
  'generated',
)
const fileInput = 'input[aria-label="Chọn file CSV"]'

test.describe('Questions — bounded XLSX import', () => {
  test.beforeEach(async ({ page }) => {
    await gotoQuestions(page)
  })

  test('imports a valid single-sheet XLSX', async ({ page }) => {
    await page.locator(fileInput).setInputFiles(path.join(GENERATED, 'questions-valid.xlsx'))
    // Scope by text: the AppShell DB badge also uses text-success-700.
    await expect(page.getByText(/Đã import 1 câu hỏi/i)).toBeVisible()
    await expect(rowByText(page, 'E2E valid xlsx question')).toBeVisible()
  })

  test('rejects a disguised .xls (unsupported file type)', async ({ page }) => {
    // Count rows before, upload the unsupported .xls, and assert the error alert
    // appears and NO new row was added. (We don't assert the list is empty: the
    // real DB persists rows across tests, so checking "no new row" is correct.)
    const before = await page.locator('table.c-table tbody tr').count()
    await page.locator(fileInput).setInputFiles(path.join(GENERATED, 'questions-legacy.xls'))
    await expect(page.getByRole('alert')).toBeVisible()
    await expect(page.locator('table.c-table tbody tr')).toHaveCount(before)
  })
})
