# slice-3.1 — Question UI and strict import completion

- Thay đổi mục gốc: slice-3 (PR5); không sửa lịch sử.
- Branch: bugfix/slice-3.1-question-completion
- Worktree: .agent-worktrees/slice3-completion
- Owner: coding agent, theo yêu cầu 2026-11-02.
- Trạng thái: Done — PR https://github.com/HomyHubs/lms/pull/7 đã MERGED vào `dev` (merge commit af04fd7, 2026-11-04). Nghiệm thu browser E2E + axe bổ sung 2026-11-12 (xem "Bàn giao E2E/axe" cuối file).
- Phụ thuộc: slice-1/3 merged theo git history (backlog lịch sử stale).

## Phạm vi trước code
1. UI edit dùng useUpdateQuestion đã tồn tại (không tạo hook trùng); create/edit explanation và sourceReference; list filters qua API/query keys.
2. CSV strict: đúng 10 headers duy nhất, không mất ô dư, lỗi quoting rõ ràng. XLSX dùng thư viện đọc chuyên biệt có kiểm tra advisory, giới hạn file/rows và reject formulas; không chấp nhận XLS/XLSM.
3. Bảo toàn errors row/field/message qua ApiError đến UI; component/parser/client regression tests thật, không stub logic nghiệp vụ.
4. Full build/lint/typecheck/test trên branch; DB integration/rollback PostgreSQL18 cô lập bắt buộc trên CI, fail khi thiếu Docker/DB/assertion/sentinel (không skip).

## Contract
Tái dùng @lms/shared và backend CRUD/import hiện có, không đổi HTTP shape/schema/RBAC/migration, không sửa generated files. Client api.ts hiện tại viết tay. Backend GET /questions hiện trả toàn bộ danh sách, chưa có query filters. List filters được áp dụng trên danh sách đã tải ở UI; không quảng cáo server pagination/filtering chưa có.

## Bàn giao
2026-11-02: full core gates `pnpm -r build && pnpm -r lint && pnpm -r typecheck && pnpm -r test` PASS: shared14 + API93 + web31 =138 tests. Giữ test smoke cũ, thêm14 parser/client tests và5 component tests dùng hook/client/parser thật. Lỗi XLSX extra cell được tái hiện, sửa mapping padding và chạy lại xanh; không tắt tests/lint.

Integration thực trên PostgreSQL18 Docker cô lập PASS: 10 migrations up/down/up; invalid import all-or-nothing với row/field; metadata create/edit/null roundtrip; bulk insert lỗi rollback; CRUD delete. Lệnh sau build: `pnpm --filter @lms/api exec node scripts/questions.integration.mjs`. Container loopback port ngẫu nhiên/tmpfs tự xóa; không đọc secret/DATABASE_URL hoặc TRUNCATE DB người dùng.

Dependency read-excel-file9.3.14 + fflate0.8.3: lý do, guardrails và audit tại `../QUESTION-IMPORT-DEPENDENCIES.md`. Zero advisory khớp dependency chain mới; toàn repo còn5critical/28high/39moderate/10low — audit không xanh, không che giấu. Không nâng dependency ngoài phạm vi.

Base remote dev đã fetch =4b6888de3d9a673d167e7369d922df46de444b16; giữ local docs commit5b1df62. Không đụng slice4 owner khác hoặc slice5, không sửa PR5/nhánh/worktree khác/generated files/untracked Postman. Chưa Done: chờ review độc lập/merge và nghiệm thu rộng hơn; chưa chạy browser E2E/axe hoặc nghiệm thu production. Hỗ trợ XLSX có giới hạn được mô tả, không quảng cáo mọi workbook.

## Bàn giao CI/test closeout — 2026-11-03 (không phải full-scope Done)
- Node24.20.0, pnpm11.24.0; fresh full gates `pnpm -r build`, `pnpm -r lint`, `pnpm -r typecheck`, `pnpm -r test`: exit0 từng lệnh. Shared14 + API93 + web31 =138 tests PASS, không skipped. Windows CMD dùng `call pnpm`.
- Fresh `pnpm --filter @lms/api exec node scripts/questions.integration.mjs`: exit0 và exact-line `QUESTIONS_PG_INTEGRATION_PASS` sau cleanup. PostgreSQL major18 được assert; 10 migrations up/down/up, CRUD, invalid import all-or-nothing, bulk failure rollback, nullable metadata persisted/readback PASS. Docker loopback random port/tmpfs/--rm, bounded Docker/DB waits; không user DB/secrets/.env.
- `.github/workflows/questions-integration.yml`: PR dev/main, contents read, Node24/pnpm theo packageManager, install/rebuild/build rồi mandatory `questions-postgres`; timeout10min, pipefail + tee + exact sentinel grep. Không if/continue-on-error/skip, Docker lỗi hoặc thiếu sentinel phải fail. Nested finally luôn thử stop container ngay cả khi pool destroy lỗi; cleanup lỗi không được in sentinel.
- Local full-gate evidence: `C:/Users/TIMKEM/AppData/Local/Temp/postman-shell-term_1793680087195_qmivfy2wg.log`; fresh DB evidence: `C:/Users/TIMKEM/AppData/Local/Temp/postman-shell-term_1793680119340_n299ye7vp.log`. `git diff --check` exit0. Exact-head CI guard/questions-postgres cần chờ completed sau push; SHA/job URLs/conclusions được ghi trong bàn giao PR cuối, không dùng kết quả CI của head cũ.
- Chỉ stage workflow/script + task/feature docs. Giữ `dependency-audit.json` untracked/unstaged; legacy82 advisories không sửa rộng. PR8/slice4/5, root/other worktrees và browser harness không đụng. Không tự approve/merge/protection/release. Review/merge/browser acceptance là phần còn lại, không nhận là Done.

## Bàn giao E2E/axe — 2026-11-12 (nghiệm thu browser còn lại)
Bổ sung bộ nghiệm thu Playwright E2E + axe cho trang Ngân hàng câu hỏi (`/questions`), phần browser acceptance đã hoãn ở các bàn giao trước. Chỉ thêm test + harness + CI, không đổi HTTP shape/schema/RBAC/migration.

- Công cụ: `@playwright/test` 1.65.0 + `@axe-core/playwright` 4.14.0 (devDependencies của `apps/web`); thêm `pg` 8.13.0 (devDep) cho harness seed/migrate. Scripts `test:e2e` / `test:e2e:ci`.
- Chạy trên stack THẬT: `apps/web/e2e/support/run-api.mjs` khởi PostgreSQL 18 Docker dùng-một-lần (loopback random port, tmpfs, --rm) → áp `db/migrations` → seed admin (tái dùng `hashPassword` từ `apps/api/dist`) → start API đã build. Vite (port 5199, host 127.0.0.1) proxy `/api` tới API qua `E2E_API_TARGET`. Không đọc DB/secret của dev; không đụng port 5173/3000.
- Specs (`apps/web/e2e/*.spec.ts`): auth setup (login SĐT+mật khẩu lưu storageState); edit flow (useUpdateQuestion + explanation/sourceReference roundtrip); client-side filters (khẳng định không GET mới); CSV import (valid + lỗi header + lỗi dòng/field "columns"); XLSX giới hạn (valid + reject .xls); create/validate/delete; axe scan (list, edit form, CSV-error state) gate critical+serious.
- Kết quả local: `14 passed` (`test-results/.last-run.json` status "passed", 0 unexpected/flaky). Lệnh: `cd apps/web && pnpm run test:e2e:ci`.
- Phát hiện accessibility: axe báo `color-contrast` (serious) ở chip trạng thái "DB: Đã kết nối" của AppShell (success/danger -600 trên nền -50 ≈ 3.57:1). Đã sửa tại `apps/web/src/components/layout/AppShell.tsx` (dùng text -700, đạt AA ≥ 4.5:1) — lỗi app-wide ngoài phạm vi slice-3.1 nhưng sửa để scan không cần loại trừ.
- CI: `.github/workflows/questions-e2e.yml` (PR dev/main, Node24/pnpm, build, cài Chromium, mandatory gate `pipefail`+`tee`+fail khi có failed/flaky). Exact-head CI cần chờ completed sau push — chưa xác nhận trên PR.
- Còn lại (không nhận là Done ở đây): review độc lập/merge; chạy CI thật trên PR; nghiệm thu production; cross-browser ngoài Chromium (Firefox/WebKit) là follow-up tuỳ chọn.
