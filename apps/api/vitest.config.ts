import { defineConfig } from 'vitest/config'

// Cau hinh tuong minh cho API.
//
// 1) Truoc day khong co file nay nen Vitest dung mac dinh; tu Vitest 4 mac dinh do
//    nhat luon `dist/**/*.test.js` do `tsc` bien dich ca file test -> moi test chay
//    2 lan (282 -> 564). Vi vay phai gioi han include ve `src/`.
//
// 2) Cac file `*.integration.test.ts` dung CHUNG mot database `lms_test` voi ID co
//    dinh (insert ... onConflict doNothing, co file con xoa du lieu cua file khac).
//    Chay song song tung bi timeout 5s/10s tren runner cham (2026-11-26: 5 test fail
//    o lan chay thu 2 trong khi lan dau xanh) — khong chi cham ma con khong tat dinh.
//    Nen tach thanh project rieng chay TUAN TU voi timeout rong hon.
export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'unit',
          include: ['src/**/*.{test,spec}.ts'],
          exclude: ['**/*.integration.test.ts', 'node_modules/**', 'dist/**'],
        },
      },
      {
        test: {
          name: 'integration',
          include: ['src/**/*.integration.test.ts'],
          exclude: ['node_modules/**', 'dist/**'],
          fileParallelism: false,
          testTimeout: 30_000,
          hookTimeout: 30_000,
        },
      },
    ],
  },
})
