# Web App Template — Profile công nghệ

Áp dụng khi loại dự án là web app có frontend và backend. Đây là profile công nghệ, không thay thế `vertical-slice.md` / `horizontal-slice.md` — dùng chung với một trong hai file đó.

## 1. Chọn loại ứng dụng trước khi chọn công nghệ

Trước khi chọn stack, xác nhận với user đang làm loại ứng dụng nào.

| Loại ứng dụng | Frontend chạy ở đâu | Backend chạy ở đâu | Database |
| --- | --- | --- | --- |
| Web app | Trình duyệt | Server/cloud | Server/cloud |
| Desktop app | Máy người dùng | Máy người dùng (embedded) | Máy người dùng (local) |
| Mobile app | Thiết bị di động | Server/cloud | Server/cloud |

Stack khuyến nghị theo loại:

| Loại | Frontend | Backend | Database |
| --- | --- | --- | --- |
| Web app | React + Vite + TypeScript | Fastify (hoặc Hono) + TypeScript | PostgreSQL (Supabase hoặc tự host) |
| Desktop app | Tauri + React (hoặc Svelte) + TypeScript | Tauri commands (Rust) | SQLite local |
| Mobile app | React Native + Expo + TypeScript | Fastify (hoặc Hono) + TypeScript | PostgreSQL (Supabase hoặc tự host) |

Lưu ý: Supabase không thay thế hoàn toàn backend. Vẫn cần backend riêng cho logic nghiệp vụ. Luồng chuẩn: Frontend → Backend (logic) → Database. Không đi thẳng Frontend → Supabase cho nghiệp vụ cần kiểm soát.

Thứ tự xử lý yêu cầu mới: xác định loại ứng dụng → chọn stack → xác định cơ chế triển khai ở `README.md` → tạo slice/layer-pass đầu tiên → demo sớm.

## 2. Stack chuẩn cho Web App

### Backend

| Hạng mục | Lựa chọn |
| --- | --- |
| Ngôn ngữ | TypeScript 5.9, ESM |
| Runtime | Node 24.x (`.nvmrc`) |
| Quản lý package | pnpm 11 workspace |
| Web framework | Fastify 5+ với `fastify-type-provider-zod` |
| Database | PostgreSQL 18 |
| Query builder | Kysely |
| Migration | dbmate |
| Validation | Zod 4 |
| Xác thực | Session opaque |
| Logging | pino |
| Observability | OpenTelemetry |
| Bảo mật HTTP | helmet, rate-limit, cors |
| Test | Vitest 4 + testcontainers |

### Frontend

| Hạng mục | Lựa chọn |
| --- | --- |
| Framework | React 19 + TypeScript + Vite |
| Data fetching | TanStack Query 5 |
| Form | react-hook-form + Zod |
| Routing | react-router-dom 7 |
| i18n | i18next |
| Date | dayjs |
| API client | Sinh tự động từ OpenAPI spec |
| Test | Vitest + Testing Library, Playwright + axe-core |
| Mock | MSW |

### Hai profile UI được phép (chọn đúng một, ghi lại quyết định)

| | Profile A (mặc định) | Profile B |
| --- | --- | --- |
| Nền tảng | MUI v6+ | Tailwind CSS + shadcn/ui |
| Bảng dữ liệu | material-react-table | TanStack Table (headless) |
| Date picker | @mui/x-date-pickers | react-day-picker |
| Icon | @mui/icons-material | lucide-react |
| Phù hợp khi | Admin/CRUD, enterprise, đội không có designer riêng | Landing page, design system riêng, UI tùy biến cao (editor, board...) |

Quy tắc quản lý profile UI: chọn trước khi viết component đầu tiên; đổi profile giữa chừng phải ghi ADR; không trộn MUI và Tailwind trong cùng một app; cổng gác nên chặn cài sai thư viện của profile kia.

### Hạ tầng và CI

| Hạng mục | Lựa chọn |
| --- | --- |
| Môi trường local | `compose.dev.yml` (Docker Compose) |
| Hạ tầng | Terraform |
| Triển khai | Cloud Run + Cloud SQL |
| CI/CD | Một pipeline GitHub Actions duy nhất |
| Secret | GCP Secret Manager |
| Quét tự động | Renovate (dependency), gitleaks (secret) |

## 3. Cấu trúc repo chuẩn

Đây là cấu trúc monorepo đầy đủ cho web app FE+BE, thay cho sơ đồ rút gọn ở `../../AGENTS.md` (mục "Sơ đồ cây thư mục"). Sơ đồ rút gọn ở đó chỉ dùng cho dự án không phải web app monorepo (service, CLI, library, hoặc web app một workspace đơn giản). Khi loại dự án là web app FE+BE dùng workspace riêng, dùng đúng cấu trúc dưới đây.

```
repo/
├── AGENTS.md
├── Makefile                      # bootstrap | dev | check | migrate
├── turbo.json                    # task graph + cache
├── pnpm-workspace.yaml
├── .nvmrc
├── docs/                         # xem ../README.md cho nội dung chi tiết
├── standards/                    # quy tắc dùng chung nhiều dự án, tách khỏi docs/ riêng dự án
│   ├── engineering-practices/
│   └── standards-governance.md
├── contracts/http/openapi.yaml
├── apps/
│   ├── web/    (+ AGENTS.md)
│   │   └── src/{app,features,components,lib,i18n,theme,utils,test,generated}
│   └── api/    (+ AGENTS.md)
│       └── src/{features,platform,main.ts}
├── packages/
│   ├── shared/          # Zod schemas, domain types, error codes dùng chung FE/BE
│   ├── api-client/      # sinh tự động từ openapi.yaml, không sửa tay
│   ├── config-eslint/
│   ├── config-ts/
│   └── config-prettier/
├── db/         (+ AGENTS.md)
├── e2e/
├── infra/
├── nginx/
└── compose.*.yml
```

Quy ước bên trong một feature khi dùng Lát cắt dọc:

```
apps/api/src/features/<feature>/
├── index.ts        # cửa công khai
├── routes.ts       # tầng HTTP, khớp openapi.yaml
├── service.ts      # domain logic, không biết HTTP
├── repository.ts   # Kysely queries
├── schema.ts       # Zod
└── __tests__/

apps/web/src/features/<feature>/
├── index.ts
├── api/            # hooks React Query bọc api-client
├── components/
├── pages/
├── hooks/
└── __tests__/
```

Nếu dùng Lát cắt ngang, thay `features/<feature>/` bằng tổ chức theo tầng trong từng workspace (ví dụ `apps/api/src/db/`, `apps/api/src/services/`, `apps/api/src/routes/`), mỗi tầng chứa toàn bộ entity trong milestone; chi tiết ở `horizontal-slice.md`.

## 4. Workflow bắt buộc

1. Đọc `../../AGENTS.md`, file cơ chế triển khai đã chọn, và file này.
2. Chốt contract (`index.ts` cho mỗi feature, `openapi.yaml` cho mọi endpoint) trước khi code.
3. Viết backend trước, sinh API client, rồi mới viết frontend dùng client đó.
4. Chạy cổng gác trước khi commit.

## 5. Lệnh chuẩn

```bash
docker compose -f compose.dev.yml up
pnpm -r lint
pnpm -r typecheck
pnpm -r test
```

## 6. Definition of Done (bổ sung riêng cho web app)

- [ ] Backend và frontend build riêng thành công
- [ ] OpenAPI spec cập nhật và client sinh lại khớp
- [ ] E2E test (Playwright) pass cho luồng chính
- [ ] Kiểm tra accessibility cơ bản (axe-core) không có lỗi nghiêm trọng
- [ ] Profile UI đã chọn không bị trộn với profile kia

## 7. Anti-pattern (bổ sung riêng cho web app)

| Anti-pattern | Thay bằng |
| --- | --- |
| Gọi thẳng Supabase từ frontend cho logic nghiệp vụ | Đi qua backend, Supabase chỉ làm hạ tầng database |
| Trộn MUI và Tailwind trong cùng app | Chọn một profile UI, đổi phải có ADR |
| Sửa tay code sinh từ OpenAPI | Sửa spec rồi sinh lại |

## 8. Trạng thái profile hiện tại (điền khi chốt)

- Loại ứng dụng: ...
- Profile UI đã chọn: [ ] A (MUI) — [ ] B (Tailwind + shadcn/ui)
- Stack thực tế khác với khuyến nghị ở đâu (nếu có): ...
