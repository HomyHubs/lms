import { defineConfig } from 'vitest/config'

// Giong apps/api: khong co config truoc day nen Vitest 4 nhat luon dist/**/*.test.js
// do `tsc` bien dich ca file test -> test chay 2 lan va 1 lan dung zod tu dist cu.
export default defineConfig({
  test: {
    include: ['src/**/*.{test,spec}.ts'],
    exclude: ['node_modules/**', 'dist/**'],
  },
})
