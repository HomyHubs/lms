# slice-2.1 — Password reset security

- Thay đổi mục gốc: slice-2 (PR4); giữ nguyên lịch sử.
- Owner: coding agent theo yêu cầu chủ sở hữu 2026-11-02.
- Branch: bugfix/slice-2.1-reset-security
- Worktree: .agent-worktrees/slice2-security
- Trạng thái: Review — PR https://github.com/HomyHubs/lms/pull/8 (base dev); chưa merge, chưa đạt DoD; không self-approve/merge.
- Phụ thuộc: slice-1/slice-2 đã merge theo git history; backlog cũ stale.

## Contract và phạm vi trước code
1. Email-only reset API; reject recipient và optional channels. Destination chỉ từ verifiedEmail do server cung cấp, không từ client.
2. Email provider fail-closed khi không cấu hình; không log OTP/PII/provider body; redact logger.
3. Regression tests injection, unavailable identity, replay, delivery failure và concurrency; full gates trước commit.

## Blocker đã xác minh
Identity hiện có chỉ users.email, không có trạng thái verified hay quy trình xác minh (git grep verified; auth/store.ts, users/store.ts). Không coi email lưu DB là verified, không backfill hoặc tạo email từ phone. Production store phải fail-closed cho đến khi owner quyết định identity verification/provisioning. Telegram không có binding verified nên tắt kể cả khi có bot token. Đây là chặn tính năng recovery thật, không phải Done.

## Đánh giá ảnh hưởng
Không migration. Contract request bị siết (recipient/WhatsApp/Telegram bị từ chối); ADR 0002. Không đổi RBAC, không đụng slice4/slice5, không sửa generated files. Email Resend đã có thật, không phải stub.

## Bàn giao
2026-11-02: đã hiện thực containment và regression tests. Full gates `pnpm -r build && pnpm -r lint && pnpm -r typecheck && pnpm -r test` PASS: shared14 + API107 + web12 =133 tests, không skip/tắt rule. Docker Desktop đã khởi động không phá hủy; PostgreSQL18 container tạm, port loopback ngẫu nhiên, tmpfs, không dùng DATABASE_URL hay secret. Integration PASS: 10 migrations up/down/up, unverified identity fail-closed, concurrent consume/replay, rollback OTP khi password update lỗi; container được xóa. Lệnh: `pnpm --filter @lms/api exec node scripts/reset.integration.mjs` sau build.

Remote dev đã fetch và vẫn là 4b6888de3d9a673d167e7369d922df46de444b16; nhánh bắt đầu từ local dev5b1df62 để bảo toàn docs commit của chủ sở hữu. Không sửa lịch sử PR4, worktree khác, root dev hay untracked Postman. Chờ review độc lập/CI/merge; không Done. Blocker verified identity ở trên vẫn còn, chưa nghiệm thu gửi email production thật.

## PR8 CI/test closeout — 2026-11-03

- Chỉ phạm vi CI/test PR8 trên worktree/branch nêu trên; không thay business policy, không self-approve/merge/release hoặc đổi branch protection.
- Workflow `.github/workflows/reset-integration.yml` thêm job `reset-postgres` trên PR vào dev/main, Node24/pnpm11, timeout 10 phút. Chạy build rồi trực tiếp script integration; không `test.skip`, không điều kiện bỏ qua DB. `set -euo pipefail` giữ lỗi qua tee và bắt buộc exact sentinel `RESET_PG_INTEGRATION_PASS`.
- Script tự tạo duy nhất PostgreSQL18 disposable (`--rm`, tmpfs, port ngẫu nhiên chỉ 127.0.0.1), không đọc DATABASE_URL/config hay secret và không nối runtime/user DB. Fixtures chỉ trong container test. Nested finally vẫn dừng container nếu đóng pool lỗi; sentinel chỉ in sau assertions và cleanup thành công.
- CI PostgreSQL **chưa được coi PASS chỉ từ local**: phải xác minh cả `guard` và `reset-postgres` ở đúng latest PR head sau push. Kết quả CI của head cũ không thay thế bằng chứng mới.
- Blocker thật vẫn nguyên: thiếu verified identity/provisioning nên production reset cố ý fail-closed; CI xanh không có nghĩa nghiệm thu real email delivery hay slice Done.
- Fresh local closeout: CMD `call pnpm -r build && call pnpm -r lint && call pnpm -r typecheck && call pnpm -r test` đạt `FULL_GATES_EXIT_CODE=0`; shared14 + API107 + web12 =133 passed, 25 test files, không skip. Log local: `%TEMP%/postman-shell-term_1793679373205_h2lvvfabg.log`.
- Fresh DB actual: `node apps/api/scripts/reset.integration.mjs` đạt 10 migrations up/down/up + legacy fail-closed + concurrent atomic consume/replay + password-update rollback; `RESET_PG_INTEGRATION_PASS` sau cleanup, `RESET_INTEGRATION_EXIT_CODE=0`. Log local: `%TEMP%/postman-shell-term_1793679399423_3d11423rp.log`. Không phải unit mock và không phải CI PASS. `git diff --check` sạch.
