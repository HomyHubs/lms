import { test, expect } from '@playwright/test'
import { createQuestion, gotoQuestions, rowByText, uniq } from './support/questions'

test.describe('Questions — edit flow (useUpdateQuestion)', () => {
  test('edits explanation + sourceReference and persists to the row', async ({ page }) => {
    await gotoQuestions(page)

    const text = uniq('E2E edit')
    await createQuestion(page, {
      level: 'starter',
      skill: 'writing',
      type: 'true_false',
      difficulty: 'hard',
      text,
      correctAnswer: 'true',
      points: '1',
      explanation: 'Original explanation',
      sourceReference: 'Original source',
    })

    // Enter edit mode for this row.
    await rowByText(page, text).getByRole('button', { name: 'Sửa', exact: true }).click()

    // Form is populated and the submit button switches to "Lưu thay đổi".
    const saveBtn = page.getByRole('button', { name: 'Lưu thay đổi', exact: true })
    await expect(saveBtn).toBeVisible()
    await expect(page.getByLabel('Giải thích')).toHaveValue('Original explanation')
    await expect(page.getByLabel('Nguồn tham khảo')).toHaveValue('Original source')

    // Change the slice-3.1 metadata fields and the question text, then save.
    const edited = `${text} EDITED`
    await page.getByLabel('Nội dung câu hỏi').fill(edited)
    await page.getByLabel('Giải thích').fill('Updated explanation')
    await page.getByLabel('Nguồn tham khảo').fill('Updated source')
    await saveBtn.click()

    // The form resets back to create mode and the row reflects the new text.
    await expect(page.getByRole('button', { name: 'Thêm câu hỏi', exact: true })).toBeVisible()
    await expect(rowByText(page, edited)).toBeVisible()
  })
})
