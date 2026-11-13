import { test as setup, expect } from '@playwright/test'
import { ADMIN_PHONE, ADMIN_PASSWORD } from './support/stack'

const AUTH_FILE = 'e2e/.auth/admin.json'

/**
 * UI-driven login: fills /login (#phone, #password) as the seeded admin, submits,
 * and persists the httpOnly session cookie (lms_session) as Playwright storageState
 * so every other spec starts already authenticated.
 */
setup('authenticate as admin', async ({ page }) => {
  await page.goto('/login')
  await page.locator('#phone').fill(ADMIN_PHONE)
  await page.locator('#password').fill(ADMIN_PASSWORD)
  await page.getByRole('button', { name: /đăng nhập/i }).click()

  // After a successful login the app redirects away from /login.
  await expect(page).not.toHaveURL(/\/login$/)
  // Sanity: the Questions page is reachable for this admin role.
  await page.goto('/questions')
  await expect(page.getByRole('heading', { name: /ngân hàng câu hỏi/i })).toBeVisible()

  await page.context().storageState({ path: AUTH_FILE })
})
