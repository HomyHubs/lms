# 0016 — Vá lỗ hổng phụ thuộc: nâng major zod / vite / vitest

- Ngày: 2026-11-26
- Trạng thái: Đã áp dụng
- Liên quan: `package.json`, `apps/*/package.json`, `packages/shared/package.json`, `pnpm-workspace.yaml`

## Bối cảnh

GitHub báo **130 lỗ hổng Dependabot** (11 critical, 43 high) trên nhánh mặc định. Chạy
`pnpm audit` trên máy cho ra **82 advisory** (5 critical, 28 high, 39 moderate, 10 low),
vì Dependabot đếm cả các bản trùng theo từng đường dẫn phụ thuộc.

Các nhóm đáng lo, xét theo khả năng bị khai thác thật:

| Nhóm | Advisory tiêu biểu | Đánh giá |
| --- | --- | --- |
| `fastify` 5.0.0 | auth bypass qua URL méo, content-type/header validation bypass, request body replacement | **Chạy thật**, có thể bypass xác thực → ưu tiên cao |
| `kysely` 0.27.4 | 3 lỗi SQL injection (`sql.lit`, JSON path key) | Chạy thật, nhưng code chỉ dùng `sql.lit` với **hằng số** timezone, không có input người dùng → không khai thác được; vẫn nâng |
| `react-router-dom` 7.1.1 | XSS, open redirect, RCE qua `turbo-stream` | Chạy thật (FE). Phần lớn advisory thuộc framework/SSR mode mà app không dùng, nhưng XSS/open redirect thì có |
| `zod` 3.23.8 | Cạn kiệt bộ nhớ khi validate collection quá lớn | Chạy thật; app parse body bằng zod nên có bề mặt |
| `proxy-addr` | IP spoofing (critical) | Kéo theo bởi fastify |
| `vitest` / `tinypool` | RCE khi API/UI server đang listen (critical) | Dev-only |
| `vite` | Nhiều lỗi `server.fs.deny` bypass, command injection qua `launch-editor` (Windows) | Dev-only |
| `eslint` chain (`brace-expansion`, `minimatch`) | DoS đệ quy | Dev-only |

## Quyết định

1. **Nâng các phụ thuộc chạy thật lên bản đã vá**, không chờ:
   `fastify` 5.0.0 → 5.12.8, `kysely` 0.27.4 → 0.28.17,
   `react-router-dom` 7.1.1 → 7.18.7, `zod` 3.23.8 → 4.6.7.
2. **Nâng bộ dev/build theo cặp tương thích**: `vite` 5.4.8 → 7.3.8,
   `@vitejs/plugin-react` 4.3.2 → 5.2.0, `vitest` 2.1.2 → 4.1.12,
   `postcss` 8.4.47 → 8.5.33, `turbo` 2.1.3 → 2.11.13, `tsx` 4.19.1 → 4.23.15.
   Vite 7 là bản thấp nhất xoá được nhóm lỗi `launch-editor` (vá ở 6.4.4) mà vẫn
   nằm trong dải `vite` mà `vitest` 4 hỗ trợ (`^6 || ^7 || ^8`).
   Không lên Vite 8 vì `@vitejs/plugin-react` 6 yêu cầu Vite 8 và Vite 8 đổi sang
   Rolldown — thay đổi lớn hơn mức cần thiết cho một bản vá bảo mật.
3. **Ghim phụ thuộc gián tiếp bằng `overrides`** thay vì nâng major của công cụ:
   `brace-expansion`, `minimatch`, `fast-uri`, `postcss-selector-parser`,
   `@eslint/plugin-kit`. Ghim theo *khoảng bị ảnh hưởng* (`pkg@<range>`) để không
   ép các nhánh major khác (ví dụ `brace-expansion` 1.x và 2.x có API khác nhau).
4. **Không** hạ chuẩn validate để né lỗi. Cụ thể: giữ nguyên `.uuid()` chặt của zod 4
   và sửa fixture test cho đúng RFC 4122, thay vì nới regex UUID.

## Hệ quả

- `pnpm audit` → **No known vulnerabilities found** (82 → 0).
- **zod 4 là thay đổi hành vi, không chỉ thay đổi kiểu:**
  - `z.string().uuid()` giờ kiểm tra đúng RFC 4122: nibble version phải là `1-8`,
    nibble variant phải là `8/9/a/b`. Fixture cũ kiểu
    `20000000-0000-0000-0000-000000000001` bị từ chối. Đã chuẩn hoá **142 literal
    trong 30 file test** (chỉ file test; dữ liệu thật/demo vốn đã hợp lệ vì sinh từ
    `gen_random_uuid()`).
  - `invalid_type_error` / `required_error` bị bỏ → dùng `error`.
    Đã đổi 7 chỗ trong `packages/shared` (`exams.ts`, `questions.ts`, `ai-generation.ts`),
    giữ nguyên message tiếng Việt không dấu như cũ.
  - `z.record(k, v)` dạng 2 tham số: code đã dùng đúng từ trước, không phải sửa.
- **Vitest 4 đổi phạm vi mặc định**: `apps/api` và `packages/shared` trước đây không có
  file cấu hình nên dùng mặc định; Vitest 4 nhặt luôn `dist/**/*.test.js` do `tsc`
  biên dịch cả file test → mỗi test chạy 2 lần (API 282 → 564) và `shared` còn chạy
  test trên `dist` cũ. Đã thêm `vitest.config.ts` cho cả hai, giới hạn `include` về
  `src/` và `exclude` `dist/`.
- **pnpm 11 không còn đọc `pnpm.overrides` trong `package.json`** (chỉ cảnh báo rồi
  bỏ qua). Overrides phải đặt trong `pnpm-workspace.yaml`.
- Tốc độ: test web 51s → 15s, test API 11s → 9s, build web 14s → 7s.
- Rủi ro còn lại: Vite 8 / Vitest 5 / zod 4.6 là các bản rất mới; nếu gặp lỗi lạ khi
  dev, nghi vấn đầu tiên nên là bộ ba này. Đường lùi: revert commit vá phụ thuộc và
  `pnpm install` lại (lockfile đi kèm commit).
