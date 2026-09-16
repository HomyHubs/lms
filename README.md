# LMS — Trung tâm Anh ngữ

English Training Center Management. Monorepo (pnpm + Turborepo) cho web app FE+BE.

## Cấu trúc

- `apps/api` — Backend Fastify + TypeScript, Postgres qua Kysely.
- `apps/web` — Frontend React 19 + Vite + Tailwind + shadcn/ui (Profile UI B).
- `packages/shared` — Zod schemas / types dùng chung FE-BE (vd `HealthResponse`).
- `packages/config-ts`, `packages/config-eslint` — config dùng chung.
- `db` — migrations Postgres (dbmate).

## Yêu cầu

- Node 24 (xem `.nvmrc`), pnpm 11, Docker.

## Chạy môi trường dev

```bash
cp .env.example .env
docker compose -f compose.dev.yml up -d        # Postgres
pnpm install
pnpm --filter @lms/db migrate                  # chạy migrations (cần dbmate)
SEED_ADMIN_PHONE=0901234567 SEED_ADMIN_PASSWORD=changeme8 \
  pnpm --filter @lms/api seed                   # tạo tài khoản admin đầu tiên (bcrypt)
pnpm dev                                        # chạy api + web
```

- API: http://localhost:3000/health
- Web: http://localhost:5173 (proxy `/api` → API), hiển thị trạng thái kết nối Database thật.

### Đăng nhập (Task 2 — slice-0)

- Trang `/login`: đăng nhập bằng số điện thoại + mật khẩu đã seed ở trên.
- Cơ chế: mật khẩu hash bcrypt; phiên là Session opaque (cookie `lms_session` HttpOnly, bảng `sessions`).
- Endpoint: `POST /auth/login` (rate limit 5 lần/phút), `GET /auth/me`, `POST /auth/logout`.

## Cổng gác (AGENTS.md mục 7)

```bash
pnpm -r lint && pnpm -r typecheck && pnpm -r test
```
