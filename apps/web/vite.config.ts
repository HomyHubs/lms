/// <reference types="vitest/config" />
import { fileURLToPath, URL } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    proxy: {
      // Proxy API calls sang backend Fastify khi chay dev, tranh CORS/hardcode host.
      // E2E_API_TARGET lets the Playwright harness point the proxy at its
      // disposable API instance (random free port); defaults to the dev backend.
      '/api': {
        target: process.env.E2E_API_TARGET ?? 'http://localhost:3000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    // Vitest unit tests live under src/. The Playwright E2E suite in e2e/ uses
    // *.spec.ts and must NOT be picked up by Vitest (it runs via `pnpm test:e2e`).
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['e2e/**', 'node_modules/**', 'dist/**'],
  },
})
