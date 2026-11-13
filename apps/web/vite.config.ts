/// <reference types="vitest/config" />
import { fileURLToPath, URL } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig(({ command }) => ({
  // Force demo (read-only, no-backend) mode for production builds. Vite statically
  // replaces import.meta.env.VITE_DEMO so the app ships the DemoDataLoader and the
  // fetch interceptor instead of calling a backend. This guarantees demo mode on
  // static hosts (e.g. Vercel) without depending on a build-time env var, which was
  // unreliable (vercel.json build.env is ignored; .env.* is gitignored).
  define: command === 'build' ? { 'import.meta.env.VITE_DEMO': JSON.stringify('1') } : {},
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      // Resolve the internal workspace package to its TypeScript source so the
      // web build does not depend on packages/shared being pre-compiled to dist/
      // (important on Vercel where only apps/web is built). Vite/esbuild compiles
      // the .ts sources inline.
      '@lms/shared': fileURLToPath(new URL('../../packages/shared/src/index.ts', import.meta.url)),
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
}))
