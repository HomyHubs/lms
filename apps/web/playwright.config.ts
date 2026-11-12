import { defineConfig, devices } from '@playwright/test'

/**
 * Dedicated API port for the E2E run, high enough to avoid a developer's dev
 * backend on 3000. Exported via process.env so BOTH global-setup (which starts
 * the disposable API) and the Playwright-spawned Vite webServer child (whose
 * proxy reads E2E_API_TARGET) agree on the same port. Override with E2E_API_PORT.
 */
const API_PORT = Number(process.env.E2E_API_PORT) || 3399
process.env.E2E_API_PORT = String(API_PORT)
process.env.E2E_API_TARGET = `http://127.0.0.1:${API_PORT}`


/**
 * Playwright acceptance harness for slice-3.1 (Questions UI + strict import).
 *
 * Runs against the REAL stack:
 *  - global-setup boots a disposable PostgreSQL 18 (Docker, loopback-only, --rm),
 *    applies db/migrations, seeds a known admin, builds + starts the Fastify API,
 *    and exports its port via process env for the web dev server proxy.
 *  - Playwright then starts the Vite dev server (port 5173) which proxies /api
 *    to the API started in global-setup (API_PORT).
 *
 * No user DB / secrets / .env are read. Everything is created and torn down here.
 */
// Dedicated E2E web port (not 5173) so a developer's running `pnpm dev` server
// never collides with the test run. The /api proxy target is unaffected.
const WEB_PORT = Number(process.env.E2E_WEB_PORT ?? 5199)

export default defineConfig({
  testDir: './e2e',
  // Auth setup must run first and produce storageState for the rest.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : [['list']],
  timeout: 60_000,
  expect: { timeout: 10_000 },
  globalSetup: './e2e/support/global-setup.ts',
  globalTeardown: './e2e/support/global-teardown.ts',
  use: {
    baseURL: `http://127.0.0.1:${WEB_PORT}`,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'setup', testMatch: /auth\.setup\.ts/ },
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'e2e/.auth/admin.json',
      },
      dependencies: ['setup'],
    },
  ],
  // Two Playwright-managed servers (started AFTER globalSetup, inheriting the
  // DATABASE_URL + PORT it exported):
  //  1) the built Fastify API against the disposable PostgreSQL 18;
  //  2) the Vite dev server, whose /api proxy targets that API (E2E_API_TARGET).
  // Playwright keeps both alive for the whole run and tears them down at the end,
  // avoiding fragile detached background processes.
  webServer: [
    {
      // Single process: boots disposable PG 18 + migrates + seeds, then starts
      // the built API against that DB (DATABASE_URL set inside the launcher).
      command: 'node e2e/support/run-api.mjs',
      env: { E2E_API_PORT: String(API_PORT) },
      url: `http://127.0.0.1:${API_PORT}/health`,
      reuseExistingServer: false,
      timeout: 90_000,
      stdout: 'pipe',
      stderr: 'pipe',
    },
    {
      command: 'pnpm exec vite --host 127.0.0.1 --port ' + WEB_PORT + ' --strictPort',
      url: `http://127.0.0.1:${WEB_PORT}`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      stdout: 'pipe',
      stderr: 'pipe',
    },
  ],
})
