import { defineConfig } from 'vitest/config'

// Cau hinh tuong minh cho API. Truoc day khong co file nay nen Vitest dung mac dinh;
// sau khi nang len Vitest 4, mac dinh do nhat luon ca `dist/**/*.test.js` do `tsc`
// bien dich ca file test -> moi test chay 2 lan (282 -> 564).
export default defineConfig({
  test: {
    include: ['src/**/*.{test,spec}.ts'],
    exclude: ['node_modules/**', 'dist/**'],
  },
})
