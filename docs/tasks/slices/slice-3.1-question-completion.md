# slice-3.1 — Question UI and strict import completion

- Thay đổi mục gốc: slice-3 (PR5); không sửa lịch sử.
- Branch: bugfix/slice-3.1-question-completion
- Worktree: .agent-worktrees/slice3-completion
- Owner: coding agent, theo yêu cầu 2026-11-02.
- Trạng thái: Đang làm; chưa merge/DoD.
- Phụ thuộc: slice-1/3 merged theo git history (backlog lịch sử stale).

## Phạm vi trước code
1. UI edit dùng useUpdateQuestion đã tồn tại (không tạo hook trùng); create/edit explanation và sourceReference; list filters qua API/query keys.
2. CSV strict: đúng 10 headers duy nhất, không mất ô dư, lỗi quoting rõ ràng. XLSX dùng thư viện đọc chuyên biệt có kiểm tra advisory, giới hạn file/rows và reject formulas; không chấp nhận XLS/XLSM.
3. Bảo toàn errors row/field/message qua ApiError đến UI; component/parser/client regression tests thật, không stub logic nghiệp vụ.
4. Full build/lint/typecheck/test trên branch; DB integration/rollback nếu hạ tầng cô lập khả dụng.

## Contract
Tái dùng @lms/shared và backend CRUD/import hiện có, không đổi HTTP shape/schema/RBAC/migration, không sửa generated files. Client api.ts hiện tại viết tay. Backend GET /questions hiện trả toàn bộ danh sách, chưa có query filters. List filters được áp dụng trên danh sách đã tải ở UI; không quảng cáo server pagination/filtering chưa có.

## Bàn giao
2026-11-02: full core gates `pnpm -r build && pnpm -r lint && pnpm -r typecheck && pnpm -r test` PASS: shared14 + API93 + web31 =138 tests. Giữ test smoke cũ, thêm14 parser/client tests và5 component tests dùng hook/client/parser thật. Lỗi XLSX extra cell được tái hiện, sửa mapping padding và chạy lại xanh; không tắt tests/lint.

Integration thực trên PostgreSQL18 Docker cô lập PASS: 10 migrations up/down/up; invalid import all-or-nothing với row/field; metadata create/edit/null roundtrip; bulk insert lỗi rollback; CRUD delete. Lệnh sau build: `pnpm --filter @lms/api exec node scripts/questions.integration.mjs`. Container loopback port ngẫu nhiên/tmpfs tự xóa; không đọc secret/DATABASE_URL hoặc TRUNCATE DB người dùng.

Dependency read-excel-file9.3.14 + fflate0.8.3: lý do, guardrails và audit tại `../QUESTION-IMPORT-DEPENDENCIES.md`. Zero advisory khớp dependency chain mới; toàn repo còn5critical/28high/39moderate/10low — audit không xanh, không che giấu. Không nâng dependency ngoài phạm vi.

Base remote dev đã fetch =4b6888de3d9a673d167e7369d922df46de444b16; giữ local docs commit5b1df62. Không đụng slice4 owner khác hoặc slice5, không sửa PR5/nhánh/worktree khác/generated files/untracked Postman. Chưa Done: chờ CI/review độc lập/merge; chưa chạy browser E2E/axe hoặc nghiệm thu production. Hỗ trợ XLSX có giới hạn được mô tả, không quảng cáo mọi workbook.
