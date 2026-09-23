# AGENTS.md — Chỉ dẫn vận hành cho AI Coding Agent (GỐC)

Đây là chỉ dẫn bắt buộc dành cho AI coding agent. Trước khi làm bất kỳ việc gì, đọc hết trang này và tuân thủ tuyệt đối.

Thay đổi quan trọng so với bản trước: file này KHÔNG còn là nơi cập nhật tiến độ task/slice hàng ngày. File này chỉ giữ quy tắc vận hành và một bảng rollup trạng thái Slice/Task ở mức cao, cập nhật duy nhất khi một Slice/Task merge xong vào `dev`. Tiến độ hàng ngày, task đang làm, và kế hoạch chi tiết nằm ở các file khác — xem mục 0 ngay dưới đây.

---

## 0. Bản đồ tài liệu và vai trò từng nhóm file

| Tài liệu                                                                             | Khi nào đọc                                                      | Vai trò                                                                                            |
| ------------------------------------------------------------------------------------ | ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `AGENTS.md` (file này, gốc repo)                                                     | Luôn luôn, đầu mỗi phiên                                         | Quy tắc vận hành + rollup trạng thái Slice/Task cấp cao. KHÔNG dùng để cập nhật tiến độ hàng ngày. |
| `docs/methodology/README.md`                                                         | Khi khởi tạo dự án hoặc chưa rõ cơ chế triển khai                | Chọn giữa Lát cắt dọc và Lát cắt ngang; có kịch bản hỏi user nếu chưa chỉ định                     |
| `docs/methodology/vertical-slice.md`                                                 | Khi cơ chế đã chọn là Lát cắt dọc                                | Quy tắc, Definition of Done, khung lộ trình theo slice                                             |
| `docs/methodology/horizontal-slice.md`                                               | Khi cơ chế đã chọn là Lát cắt ngang                              | Quy tắc, Definition of Done, khung lộ trình theo tầng                                              |
| `docs/methodology/webapp-template.md`                                                | Khi dự án là web app có frontend và backend                      | Profile công nghệ, cấu trúc repo, stack chuẩn                                                      |
| `docs/tasks/MVP-BACKLOG.md`                                                          | Đầu mỗi phiên, trước khi chọn việc                               | Bảng chỉ mục Slice/Task: trạng thái, owner, nhánh, PR, phụ thuộc                                   |
| `docs/tasks/slices/<id>-<ten>.md`                                                    | Khi làm đúng Slice/Task đó                                       | Chi tiết task, DoD riêng, stub, nợ kỹ thuật của slice đó                                           |
| `docs/tasks/CURRENT.md`                                                              | CHỈ khi một người/một agent làm tuần tự, không ai chạy song song | Con trỏ tới task đang làm; bỏ qua hoàn toàn khi làm song song nhiều dev                            |
| `docs/ai-workflow/README.md`                                                         | Đầu mỗi phiên                                                    | Vòng đời task, làm việc song song, tích hợp có ngữ cảnh, auto-merge, bàn giao phiên                |
| `<thư-mục-feature>/AGENTS.md` (theo mẫu `docs/templates/feature-AGENTS.template.md`) | Khi sửa file trong thư mục feature đó                            | Nhật ký liên tục "Đã xong / Đang làm dở / Bước tiếp theo", cập nhật mỗi ngày                       |
| `docs/decision-backlog.md`                                                           | Trước khi bắt đầu một mốc lớn                                    | Không được vượt qua một gate đang mở                                                               |
| `docs/adr/`                                                                          | Khi quyết định cross-cutting hoặc khó đảo ngược                  | Bắt buộc ghi lại                                                                                   |
| `.github/workflows/dev-health-check.yml`                                             | Khi cấu hình CI cho `dev`                                        | Chạy lại toàn bộ cổng gác mỗi khi có push vào `dev`; bắt buộc theo mục 12.4                        |

Thứ tự ưu tiên khi xung đột: `AGENTS.md` gốc → file cơ chế triển khai đã chọn (`vertical-slice.md` hoặc `horizontal-slice.md`) → `webapp-template.md` → `AGENTS.md` của feature → thói quen riêng của agent (thấp nhất).

Ngoại lệ: về thứ tự triển khai và cách chia task, file cơ chế đã chọn thắng. Về việc đang làm Slice/Task nào và tiến độ tới đâu, `docs/tasks/*` và `AGENTS.md` của feature là nguồn sự thật — `AGENTS.md` gốc không được dùng để tra cứu hay ghi việc đó, chỉ giữ rollup khi đã Done.

---

## 1. Quy tắc tối thượng

- Trạng thái làm việc hàng ngày KHÔNG được giữ trong đầu agent và KHÔNG ghi vào file này. Ghi vào `AGENTS.md` của feature (nhật ký liên tục) và file chi tiết slice/task trong `docs/tasks/slices/`.
- Mỗi khi bắt đầu phiên: đọc theo đúng thứ tự ở mục 0, xác định đang ở Slice/Task nào, rồi mới code.
- Mỗi khi hoàn thành một bước: cập nhật ngay `AGENTS.md` của feature và file slice/task liên quan.
- Trước khi kết thúc phiên, hoặc khi sắp hết token/quota: ghi bàn giao theo mục 13 rồi commit.
- File này chỉ được sửa khi: đổi quy tắc vận hành, chọn/đổi cơ chế triển khai hoặc profile công nghệ, hoặc một Slice/Task vừa merge xong vào `dev` (cập nhật bảng rollup ở cuối file).

---

## 2. Bối cảnh dự án (điền ngay khi khởi tạo repo)

| Trường                            | Giá trị                                                                                                                                                                                                                                                                                                                                                                |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tên dự án                         | LMS Trung tâm Anh ngữ                                                                                                                                                                                                                                                                                                                                                  |
| Mục tiêu một dòng                 | LMS đa cơ sở cho trung tâm Anh ngữ: thi online chấm điểm tự động + thi lại, ngân hàng câu hỏi theo cấp độ (Starter/Mover/Flyer) có hỗ trợ sinh câu hỏi qua AI ngoài, điểm danh, xếp loại học viên, đăng nhập bằng SĐT, và quản lý ngày công/giờ dạy giáo viên                                                                                                          |
| Loại dự án                        | web app FE+BE                                                                                                                                                                                                                                                                                                                                                          |
| Cơ chế triển khai đã chọn (mục 3) | Lát cắt dọc                                                                                                                                                                                                                                                                                                                                                            |
| Profile công nghệ áp dụng         | Web app FE+BE (`docs/methodology/webapp-template.md`)                                                                                                                                                                                                                                                                                                                  |
| Stack thực tế                     | Backend: Fastify + TypeScript, PostgreSQL, pnpm + Turborepo (monorepo). Frontend: 1 web app duy nhất (React/Next.js hoặc SPA) dùng chung cho Admin/Teacher/Staff/Học viên, menu/route ẩn hiện theo role (RBAC) + theo cơ sở (branch-scoped). Hạ tầng: Docker, GitHub Actions CI. Tích hợp ngoài: WhatsApp Business API, Telegram Bot API, Email provider (OTP đa kênh) |
| Điểm khởi đầu                     | Yêu cầu chi tiết: trang Notion "LMS Trung tâm Anh ngữ — Đặc tả yêu cầu đầy đủ (Vertical Slice Plan)"; slice đầu tiên: `docs/tasks/slices/slice-0-nen-tang-auth.md`                                                                                                                                                                                                     |
| Cách chạy local                   | `docker compose -f compose.dev.yml up` (điền lại khi khung backend/frontend dựng xong ở slice-0)                                                                                                                                                                                                                                                                       |
| Người hoặc nhóm sở hữu            | Hoang An                                                                                                                                                                                                                                                                                                                                                               |

Nếu loại dự án là web app có frontend và backend, áp dụng thêm `docs/methodology/webapp-template.md`. Ghi tên profile đã chọn vào bảng trên.

---

## 3. Chọn cơ chế triển khai: Lát cắt dọc hay Lát cắt ngang

Dự án này hỗ trợ CẢ HAI cơ chế triển khai: Lát cắt dọc (Vertical Slice) và Lát cắt ngang (Horizontal Slice). Đây là quyết định phải chốt sớm vì nó chi phối cách chia task, đặt ID, và cách nhiều dev làm song song.

Quy tắc bắt buộc:

1. Nếu user đã nêu rõ cơ chế muốn dùng (ví dụ: "làm theo vertical slice", "mỗi lần ra một tính năng bấm được", "làm xong hết database rồi mới đến API", "lát cắt ngang") → dùng đúng cơ chế đó, không hỏi lại.
2. Nếu user KHÔNG nêu rõ → PHẢI dừng lại và hỏi user trước khi lên kế hoạch chia task hoặc viết code, kèm giải thích ngắn gọn. Không tự ý mặc định chọn một trong hai.
3. Nội dung câu hỏi và bảng so sánh chi tiết nằm ở `docs/methodology/README.md`. Đọc file đó để lấy đúng kịch bản hỏi.
4. Sau khi chọn, ghi vào bảng Bối cảnh dự án (mục 2) và dùng đúng file quy tắc: `docs/methodology/vertical-slice.md` hoặc `docs/methodology/horizontal-slice.md`.
5. Cho phép hỗn hợp theo milestone (một số milestone dùng dọc, một số dùng ngang), nhưng phải ghi rõ trong `docs/tasks/MVP-BACKLOG.md` milestone nào dùng cơ chế nào, kèm lý do, và bắt buộc ghi ADR vì đây là quyết định cross-cutting.

---

## 4. Nhận diện cấu trúc repo hiện có (bắt buộc làm trước mục 5)

Trước khi áp dụng bất kỳ sơ đồ thư mục nào, quét repo và xác định đã chia theo chức năng hay chưa.

**Bước làm:**

1. Quét cây thư mục gốc và `src/` (hoặc thư mục nguồn tương đương).
2. Nhận diện dấu hiệu đã chia: thư mục theo feature (`auth/`, `payment/`...), theo tầng (`frontend/`, `backend/`, `api/`...), hoặc monorepo (`modules/`, `packages/`, `apps/`, `services/`...).
3. Ghi quyết định vào bảng Bối cảnh dự án (mục 2).

### Trường hợp A — Repo đã chia thư mục theo chức năng

Tuân theo cấu trúc đang có. Không đập đi tái cấu trúc, không đổi tên hàng loạt.

- Giữ nguyên quy ước đặt thư mục hiện tại của repo.
- Đặt `AGENTS.md` gốc ở root repo (file này).
- Tạo `AGENTS.md` con trong từng thư mục chức năng đã tồn tại, theo mẫu `docs/templates/feature-AGENTS.template.md`.
- Áp nguyên tắc chung (đóng gói theo module, import qua cửa công khai `index.ts`, cổng gác ở mục 7, chốt contract ở mục 8) lên cấu trúc sẵn có.

### Trường hợp B — Repo chưa chia thư mục theo chức năng

Áp dụng sơ đồ ở mục 5 làm khuôn mẫu. Di chuyển dần code vào đúng module theo phạm vi từng task, không refactor toàn bộ một lần.

---

## 5. Sơ đồ cây thư mục (áp dụng cho Trường hợp B)

Sơ đồ dưới đây là bản rút gọn, dùng khi loại dự án KHÔNG phải web app FE+BE monorepo (service, CLI, library, hoặc web app một workspace đơn giản). Nếu loại dự án là web app FE+BE dùng workspace riêng (`apps/web`, `apps/api`), dùng cấu trúc monorepo đầy đủ ở `docs/methodology/webapp-template.md` thay cho sơ đồ này.

```
your-project/
├── AGENTS.md
├── package.json
├── docs/
│   ├── README.md
│   ├── decision-backlog.md
│   ├── adr/
│   ├── methodology/
│   │   ├── README.md
│   │   ├── vertical-slice.md
│   │   ├── horizontal-slice.md
│   │   └── webapp-template.md
│   ├── tasks/
│   │   ├── MVP-BACKLOG.md
│   │   ├── CURRENT.md
│   │   └── slices/
│   │       ├── _TEMPLATE.md
│   │       └── slice-0-walking-skeleton.md
│   ├── ai-workflow/
│   │   ├── README.md
│   │   └── templates/
│   │       ├── execution-log.md
│   │       ├── review-log.md
│   │       └── session-handoff.md
│   └── templates/
│       └── feature-AGENTS.template.md
├── .github/
│   └── workflows/
│       └── auto-merge.yml
├── src/
│   ├── app.ts
│   └── features/
│       ├── auth/
│       │   ├── AGENTS.md
│       │   ├── auth.service.ts
│       │   ├── auth.routes.ts
│       │   ├── auth.test.ts
│       │   └── index.ts
│       └── payment/
│           ├── AGENTS.md
│           ├── payment.service.ts
│           └── index.ts
└── tests/
```

Nếu cơ chế triển khai là Lát cắt ngang, tổ chức thư mục theo tầng thay vì theo feature: `src/db/`, `src/services/`, `src/routes/`, mỗi tầng chứa toàn bộ entity trong milestone. Chi tiết ở `docs/methodology/horizontal-slice.md`.

**Nguyên tắc cấu trúc giữ cho cả hai trường hợp A và B:**

- Gom mọi thứ của một chức năng (hoặc một tầng, nếu dùng lát cắt ngang) vào đúng thư mục của nó.
- Module A không được import trực tiếp vào file bên trong module B. Chỉ qua cửa công khai (`index.ts`).
- Mỗi chức năng có một `AGENTS.md` riêng để ghi nhật ký của nó.

---

## 6. Quy tắc bắt buộc khi code

- Trước khi code: đọc `docs/tasks/MVP-BACKLOG.md` và file slice/task chi tiết để biết đang ở đâu.
- Nếu Slice/Task hiện tại có cột "Phụ thuộc": kiểm tra trạng thái phụ thuộc đó trong `MVP-BACKLOG.md`. Nếu chưa "Done" (PR chưa pass review và chưa merge vào `dev`), DỪNG lại và đợi — không code trước, không tạo nhánh trước. Ghi lý do đang chờ vào file slice/task.
- Chỉ sửa file thuộc phạm vi Slice/Task hiện tại. Không sửa file ngoài phạm vi.
- Commit nhỏ, message rõ ràng.
- Sau khi code xong một bước: chạy đầy đủ cổng gác ở mục 7.
- Sau mỗi bước hoàn thành: cập nhật `AGENTS.md` của feature và file slice/task.
- Thứ tự triển khai theo đúng file cơ chế đã chọn ở mục 3 (`vertical-slice.md` hoặc `horizontal-slice.md`).

---

## 7. Cổng gác tất định (chạy trước khi coi là "xong")

```bash
npm run lint && npm run typecheck && npm test
```

- PASS hết → được phép commit.
- FAIL → không commit vào nhánh chính. Tạo nhánh sửa lỗi `repair/<mô-tả>` và sửa tới khi pass.
- "Đúng hay sai" do test quyết định, không do phán đoán chủ quan.
- Lệnh trên là tối thiểu. Nếu repo có profile công nghệ, chạy đúng cổng gác của profile đó (ví dụ `make check` hoặc `pnpm -r check`).
- Lint chạy ở chế độ không cho phép warning. Không tắt rule để làm xanh cổng gác.
- Mọi cổng gác chạy cục bộ phải chạy y nguyên trên CI.
- Cổng gác này chỉ chạy trên nhánh của PR. Bắt buộc có thêm cổng gác chạy lại trên `dev` sau mỗi merge — xem mục 12.4; không được coi cổng gác PR là đủ để đảm bảo `dev` luôn lành.

---

## 8. Chốt hợp đồng (contract) trước khi làm

Trước khi hiện thực một feature, định nghĩa và cố định interface công khai của nó trong cửa công khai (`index.ts`). Không đổi contract giữa chừng.

```ts
// src/features/auth/index.ts — chốt trước, không đổi giữa chừng
export interface AuthModule {
  getCurrentUser(token: string): Promise<User | null>
  login(email: string, pass: string): Promise<Token>
}
```

---

## 9. Làm việc song song nhiều dev / nhiều feature

Mục tiêu: nhiều dev/agent làm cùng lúc mà không đụng file nhau, và biết chính xác việc nào chạy song song được, việc nào phải chờ.

1. Mỗi Slice/Task/layer-pass có đúng một Owner tại một thời điểm, ghi trong cột Owner của `docs/tasks/MVP-BACKLOG.md`. Không nhận việc đã có Owner.
2. Mỗi Owner làm trong một worktree và một nhánh riêng:

```bash
git worktree add ../proj-auth      -b feature/slice-3-auth
git worktree add ../proj-payment   -b feature/slice-4-payment
```

3. Không có hai dev/agent cùng sửa một file dùng chung tại cùng thời điểm.
4. Không bắt đầu Slice/Task có cột "Phụ thuộc" (trong `MVP-BACKLOG.md`) chưa ở trạng thái Done (đã pass review và merge vào `dev`). Trạng thái "Đang làm" của phụ thuộc KHÔNG đủ điều kiện để bắt đầu. Ngoại lệ chỉ áp dụng khi chính người dùng (không phải agent tự quyết) chủ động yêu cầu làm song song tuần tự, và phải ghi rõ lý do + rủi ro vào `MVP-BACKLOG.md`.
5. Với file dùng chung bắt buộc (ví dụ điểm ghép router tổng), dùng kiểu "mỗi dòng độc lập" để giảm conflict:

```ts
// src/app.ts
import { registerAuthRoutes } from './features/auth'
import { registerPaymentRoutes } from './features/payment'
registerAuthRoutes(app)
registerPaymentRoutes(app)
```

6. Chi tiết vòng đời, quy trình tích hợp và bàn giao phiên khi làm song song: xem `docs/ai-workflow/README.md`.

---

## 10. Quy trình tích hợp (merge) có ngữ cảnh

Trước khi merge một Slice/Task vào `dev`, người hoặc agent thực hiện merge phải:

1. Kéo `dev` mới nhất về nhánh của Slice/Task đang làm, giải quyết conflict cục bộ.
2. Đọc `docs/tasks/MVP-BACKLOG.md` để liệt kê các Slice/Task khác đã merge vào `dev` kể từ khi nhánh này được tạo.
3. Với mỗi Slice/Task đó, đọc nhanh mục "Đã xong" gần nhất trong `AGENTS.md` của feature liên quan để biết có đổi contract, schema, hoặc điểm ghép dùng chung hay không.
4. Nếu có thay đổi ảnh hưởng: cập nhật code đang merge cho khớp, không ghi đè thay đổi của Slice/Task kia.
5. Chạy lại toàn bộ cổng gác (mục 7) sau khi rebase.
6. Mô tả PR phải nêu: Slice/Task ID, cơ chế triển khai, các Slice/Task khác có giao nhau về file, đã rebase với `dev` tại commit nào.
7. Reviewer xác nhận trước khi duyệt: không có drift OpenAPI/contract, migration chỉ thêm (additive), `AGENTS.md` của feature đã cập nhật, `MVP-BACKLOG.md` đã cập nhật đúng trạng thái.

Quy trình đầy đủ, kèm checklist reviewer: `docs/ai-workflow/README.md`.

---

## 11. Mô hình nhánh, release và hotfix

Agent tự tạo và quản lý nhánh. Người dùng không cần nêu tên nhánh.

### 11.1 Vai trò từng nhánh

| Nhánh           | Vai trò                                                    | Tách ra từ | Merge trở lại vào    | Code trực tiếp?                     |
| --------------- | ---------------------------------------------------------- | ---------- | -------------------- | ----------------------------------- |
| `main`          | Bản ổn định để build và giao cho user (production/release) | —          | —                    | KHÔNG                               |
| `dev`           | Nhánh tích hợp/phát triển mặc định                         | `main`     | `main` (khi release) | Hạn chế, ưu tiên qua feature branch |
| `feature/<tên>` | Một Slice/Task/layer-pass                                  | `dev`      | `dev`                | CÓ                                  |
| `bugfix/<tên>`  | Sửa lỗi trong code chưa release (đang ở `dev`)             | `dev`      | `dev`                | CÓ                                  |
| `hotfix/<tên>`  | Sửa lỗi production cần release gấp                         | `main`     | `main` rồi `dev`     | CÓ                                  |

Mọi Slice/Task làm trên nhánh riêng và mở PR với base = `dev`. Không mở PR thẳng vào `main`.

### 11.2 Khi nào build cho user

Chỉ build bản giao cho user từ `main`. Không bao giờ build từ `dev` hay nhánh feature/hotfix chưa merge.

### 11.3 Feature/Slice/Task mới

```bash
git checkout dev && git pull origin dev
git checkout -b feature/<slice-id>-<tên>
# ... code trong đúng phạm vi ...
# chạy cổng gác mục 7, PASS mới commit
# mở PR base = dev — không tự merge tay, xem mục 12 (auto-merge)
```

### 11.4 Đưa `dev` về `main` (release)

Chỉ merge `dev` → `main` khi: mọi Slice/Task trong `dev` đã Done, cổng gác xanh, không còn code dở, migration đã kiểm tra, app chạy end-to-end. Đây là hành động do người dùng ra lệnh; agent không tự release.

```bash
git checkout dev && git pull origin dev
git checkout main && git pull origin main
git merge --no-ff dev
git push origin main
git tag -a v<x.y.z> -m "release: <tóm tắt>" && git push origin --tags
```

### 11.5 Hotfix

Khi user báo cần sửa trên `main`: tách hotfix từ `main`, sửa nhỏ nhất đúng lỗi, chạy cổng gác, merge vào `main`, tag version, rồi merge `main` ngược lại vào `dev`.

```bash
git checkout main && git pull origin main
git checkout -b hotfix/<tên-lỗi>
# ... sửa lỗi tối thiểu, chạy cổng gác mục 7 ...
git checkout main && git merge --no-ff hotfix/<tên-lỗi> && git push origin main
git tag -a v<x.y.z+1> -m "fix: <tóm tắt>" && git push origin --tags
git checkout dev && git pull origin dev && git merge main && git push origin dev
```

### 11.6 Suy luận nhánh từ yêu cầu người dùng

| Người dùng nói                           | Agent tự làm                                |
| ---------------------------------------- | ------------------------------------------- |
| "Làm feature X" / "làm Slice/Task X"     | Tạo `feature/...` từ `dev`, PR base = `dev` |
| "Sửa bug trên bản đang phát triển"       | Tạo `bugfix/...` từ `dev`, PR base = `dev`  |
| "Cần sửa trên main" / "user đang bị lỗi" | Tạo `hotfix/...` từ `main`, xem mục 11.5    |
| "Release" / "đưa dev về main"            | Merge `dev` → `main`, xem mục 11.4          |

---

## 12. Auto-merge sau khi review pass và xóa nhánh — TIÊU CHUẨN BẮT BUỘC

Đây là cổng gác quan trọng nhất trước khi code vào `dev`. Toàn bộ mục 12 là BẮT BUỘC, không phải gợi ý. Nếu phát hiện đang làm sai bất kỳ mục nào dưới đây, PHẢI dừng auto-merge và sửa ngay theo "Sửa gấp" tương ứng trước khi merge thêm bất kỳ PR nào khác.

### 12.1 "Approved" hợp lệ là gì (bắt buộc chọn đúng 1 trong 2 cơ chế)

Một comment thường — dù có nội dung JSON hay kết luận rõ ràng — KHÔNG được coi là "Approved". Chỉ 1 trong 2 cơ chế sau được coi là hợp lệ để auto-merge:

- **Cơ chế A — Pull Request Review chính thức**: gọi GitHub Reviews API (`POST /repos/{owner}/{repo}/pulls/{pull_number}/reviews`, `event: APPROVE`), xuất hiện trong tab Reviewers của PR trên GitHub. `event: REQUEST_CHANGES` phải chặn merge.
- **Cơ chế B — Custom Status Check**: sau khi có kết luận, gọi `POST /repos/{owner}/{repo}/statuses/{sha}` với `state: success` / `failure` và một `context` riêng (ví dụ `codex-review-pro`); context này phải nằm trong "Require status checks to pass before merging" của branch protection trên `dev`.

Chọn đúng 1 cơ chế cho toàn bộ luồng và ghi rõ trong `docs/ai-workflow/README.md`. Không trộn lẫn cả hai trong cùng một luồng review.

**Nhận diện làm sai**: mở lại một PR đã merge — nếu dùng Cơ chế A mà tab Reviewers không có review "Approved" nào, hoặc dùng Cơ chế B mà tab Checks không có context riêng nào chạy — nghĩa là cổng gác chưa từng hoạt động thật, chỉ đang merge dựa trên comment.
**Sửa gấp**: dừng auto-merge ngay (tắt "Allow auto-merge" hoặc tạm gỡ workflow) tới khi cấu hình đúng theo 12.1–12.3; rà lại bằng tay các PR đã merge gần nhất trong lúc cấu hình còn sai.

### 12.2 Identity duyệt/merge phải khác identity code (bắt buộc)

Identity thực hiện Cơ chế A hoặc B ở mục 12.1 phải KHÁC identity đã push code / mở PR đó. GitHub tự chặn self-review ở Cơ chế A; Cơ chế B không tự chặn, phải tự đảm bảo bằng quy ước — không dùng token của agent code để tự set status check cho PR của chính nó.

Cách tạo identity riêng — chọn 1:

- Machine user account riêng: token fine-grained (quyền Contents + Pull requests), gắn vào repo với quyền Write. Nhanh, nhưng tốn 1 seat nếu repo ở tổ chức trả phí theo seat.
- GitHub App riêng: không tốn seat, xác thực qua JWT + installation token. Dùng script `github_app_auth.py` (hướng dẫn setup tay nằm ngay đầu file đó) để tự động lấy token và gọi Cơ chế A hoặc B.

**Nhận diện làm sai**: PR được duyệt/merge bởi cùng username hoặc cùng token đã tạo commit trong chính PR đó.
**Sửa gấp**: dừng auto-merge, tạo identity riêng theo 1 trong 2 cách trên trước khi duyệt/merge PR tiếp theo.

### 12.3 Branch protection bắt buộc trên `dev`

Checklist bắt buộc, kiểm tra tại Settings → Branches → rule của `dev`:

- [ ] "Require a pull request before merging" — bật
- [ ] "Require approvals" ≥ 1 (Cơ chế A) hoặc "Require status checks to pass before merging" chứa đúng context riêng (Cơ chế B)
- [ ] "Require branches to be up to date before merging" — bật (để không merge PR dựa trên `dev` đã cũ hơn các PR song song khác vừa merge)
- [ ] "Require status checks to pass before merging" chứa cổng gác mục 7 (chạy trên nhánh PR)
- [ ] "Do not allow bypassing the above settings" — bật, áp dụng cả cho admin
- [ ] "Restrict who can push to matching branches" — chỉ cho phép identity merge riêng ở mục 12.2

**Nhận diện làm sai**: bất kỳ ô nào trong checklist trên đang tắt.
**Sửa gấp**: bật lại ngay trước khi merge PR tiếp theo; nếu đã có PR merge trong lúc thiếu cấu hình, rà lại các PR đó bằng tay.

### 12.4 Kiểm tra sức khỏe toàn hệ thống sau khi merge (bắt buộc)

Cổng gác mục 7 chỉ chạy trên nhánh của PR tại thời điểm PR được tạo — không phát hiện được lỗi phát sinh khi nhiều PR song song cộng lại trên `dev` (semantic conflict). Vì vậy bắt buộc có thêm một workflow chạy lại toàn bộ `npm run lint && npm run typecheck && npm test` (hoặc cổng gác của profile công nghệ đang dùng) mỗi khi có commit mới trên `dev` (trigger theo `push` vào `dev`, không phải chỉ theo PR). Cấu hình mẫu: `.github/workflows/dev-health-check.yml`. Vì workflow này chạy sau khi push đã xảy ra, nó không thể tự động chặn merge gây ra nó — việc chặn các merge tiếp theo là bắt buộc thực hiện theo quy trình dưới đây, không phải qua cấu hình GitHub.

**Nhận diện làm sai**: không có workflow nào trigger theo `push` vào `dev`; hoặc có nhưng đang fail mà không ai xử lý, các PR khác vẫn tiếp tục merge bình thường.
**Sửa gấp**: nếu workflow này FAIL sau một merge — dừng merge mọi PR khác vào `dev` ngay, tạo nhánh `bugfix/dev-health-<mô tả>` sửa ưu tiên cao nhất, chỉ tiếp tục merge PR khác sau khi workflow này xanh lại.

### 12.5 Nhắc thêm — không bắt buộc, đừng quên

- Kiểm tra định kỳ "Automatically delete head branches" vẫn đang bật (xóa nhánh nguồn tự động sau merge).
- Giữ lại comment JSON audit-trail của quá trình review (nếu dùng luồng ChatGPT Web/browser) để dễ truy lại lý do một PR được duyệt khi cần debug.
- Renew token/App key của identity merge riêng (mục 12.2) trước khi hết hạn, đặt lịch nhắc trước ngày hết hạn.

---

## 13. Quy trình bàn giao giữa phiên

Áp dụng khi hết token, hết quota, mất điện, máy treo, hoặc dừng chủ động.

1. Cập nhật `AGENTS.md` của feature (nhật ký liên tục) và mục "Bàn giao phiên gần nhất" trong file slice/task tương ứng (`docs/tasks/slices/<id>.md`), theo mẫu `docs/ai-workflow/templates/session-handoff.md`.
2. Commit lại kể cả khi chưa xong: `git commit -m "wip: <mô tả>"`.
3. Nếu chỉ một người/một agent làm tuần tự (không ai chạy song song), cũng cập nhật `docs/tasks/CURRENT.md`. Nếu đang làm song song nhiều dev, bỏ qua file này hoàn toàn.
4. Nếu bị ngắt đột ngột và phiên trước không kịp ghi bàn giao: phiên sau phải tự suy luận trạng thái từ `git log`, `git diff dev...HEAD`, và kết quả cổng gác hiện tại, rồi cập nhật lại bàn giao cho đúng trước khi tiếp tục. Không giả định "chắc là đã xong".
5. Agent kế tiếp chỉ cần đọc theo đúng thứ tự ở mục 0 là tiếp tục được, không cần hỏi lại người dùng những gì đã có trong tài liệu.

Chi tiết và quy tắc suy luận khi mất bàn giao: `docs/ai-workflow/README.md`.

---

## 14. Bảo mật và secret (không thỏa hiệp)

- Không commit secret vào repo, image, log, fixture hay tài liệu. Chỉ commit file ví dụ như `.env.example` với giá trị giả.
- Secret thật nạp lúc runtime từ secret manager. Không dùng file `.env` cho staging hoặc production.
- Bật quét secret trong CI (ví dụ gitleaks). Nếu phát hiện secret đã lọt, thu hồi và xoay khóa trước, xóa lịch sử sau.
- Không in secret, token, header Authorization hay dữ liệu cá nhân ra log, terminal, issue hay chat.
- Mọi input từ bên ngoài (body, query, param, biến môi trường) phải validate bằng schema trước khi dùng.
- Thêm dependency mới phải ghi lý do trong PR và kiểm tra lỗ hổng đã biết.

---

## 15. Nhật ký, quan sát, xử lý lỗi

- Dùng logger có cấu trúc, kèm request-id lan truyền từ frontend xuống backend. Không rải `console.log`.
- Bật redact cho trường nhạy cảm ngay tại cấu hình logger.
- Mọi service phải có endpoint kiểm tra sức khỏe, tách riêng "còn sống" và "sẵn sàng nhận traffic".
- Lỗi trả về theo bộ error code tập trung. Không lộ stack trace ra client.
- Không bắt lỗi rồi bỏ qua im lặng.

---

## 16. Dữ liệu và migration

- Migration là append-only. Không sửa migration đã merge, chỉ thêm migration mới.
- Mỗi migration phải đảo ngược được và đã test rollback trước khi coi là xong.
- Không sửa schema trực tiếp trên bất kỳ môi trường nào.
- Thay đổi phá vỡ chia hai bước: thêm cái mới và tương thích ngược trước, xóa cái cũ ở release sau.
- Seed tách riêng theo môi trường. Integration test chạy trên database thật trong container.

---

## 17. Contract API và code sinh tự động

- Nếu dự án có API giữa frontend và backend, spec (ví dụ `contracts/http/openapi.yaml`) là nguồn sự thật duy nhất. Sửa spec trước, sinh lại client, rồi mới viết code.
- Thư mục code sinh tự động không được sửa tay.
- CI phải có gate chống lệch giữa spec và code sinh ra.
- Kiểu dữ liệu và schema dùng chung giữa hai đầu phải ở một package chia sẻ.

---

## 18. Tài liệu và ADR

- Quyết định cross-cutting hoặc khó đảo ngược phải có ADR đánh số tuần tự trong `docs/adr/`.
- ADR đã Accepted hoặc Rejected là bất biến. Muốn đổi thì tạo ADR mới thay thế và cập nhật index.
- Rule dùng chung nhiều dự án để ở `standards/`. Tài liệu riêng dự án để ở `docs/`. Không nhân bản cùng một rule ở hai nơi.
- Sửa hành vi thì sửa luôn tài liệu sở hữu hành vi đó trong cùng PR.

---

## 19. Quy ước commit và pull request

- Commit theo Conventional Commits, ví dụ `feat(auth): ...`, `fix(api): ...`, `docs(adr): ...`, `wip: ...` khi bàn giao giữa phiên.
- Một PR giải quyết một mục đích (một Slice/Task). Refactor lớn tách PR riêng, không gắn kèm feature.
- PR phải nêu: làm gì, tại sao, ảnh hưởng tới đâu, đã test thế nào, dependency mới n��u có và lý do, và các mục ở mục 10 (ngữ cảnh tích hợp).
- PR luôn có base = `dev` (trừ hotfix có base = `main`, xem mục 11.5). Không force push lên nhánh người khác đang dùng. Không commit trực tiếp lên nhánh chính.
- Sau khi review pass **theo đúng 1 trong 2 cơ chế bắt buộc ở mục 12.1** (Pull Request Review chính thức hoặc Custom Status Check — không phải comment thường), PR tự động merge và xóa nhánh theo mục 12; không tự merge tay trừ khi auto-merge không khả dụng.

---

## 20. Definition of Done chung

Một Slice/Task/layer-pass chỉ được coi là xong khi đủ tất cả:

- [ ] Contract của module đã được chốt và không đổi giữa chừng; nếu có API thì spec đã cập nhật và client đã sinh lại
- [ ] Có test cho logic nghiệp vụ và test tích hợp cho đường đi qua dữ liệu thật
- [ ] Toàn bộ cổng gác ở mục 7 xanh cả cục bộ và trên CI
- [ ] Không thêm secret, không thêm kiểu dữ liệu bỏ kiểm tra, không tắt rule lint mà không ghi lý do
- [ ] Log có cấu trúc và request-id; lỗi trả về theo error code tập trung
- [ ] Migration đảo ngược được và đã test rollback
- [ ] Chỉ sửa file trong phạm vi Slice/Task, không rò rỉ refactor ngoài phạm vi
- [ ] Tài liệu/ADR liên quan đã cập nhật
- [ ] `AGENTS.md` của feature và file slice/task chi tiết đã cập nhật và đã commit
- [ ] `docs/tasks/MVP-BACKLOG.md` đã chuyển đúng trạng thái

DoD bổ sung riêng theo cơ chế triển khai: xem `docs/methodology/vertical-slice.md` hoặc `docs/methodology/horizontal-slice.md`.

---

## 21. Anti-pattern cấm tuyệt đối

| Anti-pattern                                                                     | Thay bằng                                                                 |
| -------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| Ghi tiến độ hàng ngày vào `AGENTS.md` gốc                                        | Ghi vào `AGENTS.md` của feature + file slice/task, mục 0                  |
| Dùng `docs/tasks/CURRENT.md` khi đang chạy song song nhiều dev                   | Dùng `MVP-BACKLOG.md` (cột Owner) + `AGENTS.md` của feature               |
| Đập đi tái cấu trúc repo đã có quy ước                                           | Trường hợp A ở mục 4, bổ sung dần theo task                               |
| Import thẳng vào file bên trong module khác                                      | Chỉ import qua cửa công khai `index.ts`                                   |
| Đổi contract giữa chừng khi đang code                                            | Chốt contract trước, đổi thì làm ADR                                      |
| Tắt rule lint hoặc bỏ test để làm xanh cổng gác                                  | Sửa nguyên nhân, nếu phải tắt thì ghi lý do ngay tại chỗ                  |
| Hai dev/agent cùng sửa một file dùng chung cùng lúc                              | Worktree riêng, điểm ghép mỗi dòng độc lập, mục 9                         |
| Merge một Slice/Task mà không đọc các Slice/Task khác đã merge                   | Quy trình tích hợp có ngữ cảnh, mục 10                                    |
| Tự merge tay PR đã pass review                                                   | Auto-merge + xóa nhánh, mục 12                                            |
| Coi comment (dù có JSON/kết luận rõ ràng) là "Approved"                          | Chỉ 2 cơ chế hợp lệ: Review chính thức hoặc Custom Status Check, mục 12.1 |
| Cùng một identity vừa code/push vừa duyệt hoặc merge PR                          | Identity duyệt/merge riêng biệt, mục 12.2                                 |
| Merge PR khi `dev` đã đi xa mà chưa cập nhật/rebase                              | Bật "Require branches to be up to date", mục 12.3                         |
| Không kiểm tra lại sức khỏe `dev` sau nhiều PR song song merge                   | Dev health-check bắt buộc sau mỗi merge, mục 12.4                         |
| Kết thúc phiên mà không commit và không ghi bàn giao                             | Quy trình bàn giao ở mục 13                                               |
| Giả định "chắc là đã xong" khi không có ghi chú rõ ràng sau khi bị ngắt đột ngột | Suy luận từ git log/diff và chạy lại cổng gác trước khi tiếp tục          |
| Mở PR thẳng vào `main` cho Slice/Task thường                                     | PR base = `dev`, mục 11                                                   |
| Đánh số lại hoặc xóa dòng Slice/Task khi đổi phạm vi                             | ID bất biến, chỉ thêm dòng mới, mục 22                                    |
| Tự chọn cơ chế triển khai khi user chưa nói rõ                                   | Hỏi user trước, mục 3                                                     |
| Sao chép toàn bộ nội dung task/slice sang `AGENTS.md` gốc "cho dễ xem"           | Chỉ giữ rollup cấp Slice; chi tiết ở `docs/tasks/*`                       |

---

## 22. Quy trình thay đổi phạm vi (thêm / sửa / xóa tính năng)

Nguyên tắc gốc: ID của Slice/Task là bất biến. Không đánh số lại, không dùng lại số đã cấp, không xóa dòng khỏi `docs/tasks/MVP-BACKLOG.md`. Mọi thay đổi phạm vi là thêm dòng mới.

### 22.1 Quy tắc đánh số

| Tình huống                           | Cách làm                                                                          | Ví dụ                        |
| ------------------------------------ | --------------------------------------------------------------------------------- | ---------------------------- |
| Tính năng mới, làm sau cùng          | Cấp ID tiếp theo                                                                  | slice-9, slice-10            |
| Tính năng mới phải chèn giữa         | Dùng số thập phân                                                                 | slice-4.5                    |
| Mục công việc quá to                 | Giữ số gốc, thêm hậu tố chữ                                                       | slice-5 → slice-5a, slice-5b |
| Thêm/sửa task ở Slice `Chưa bắt đầu` | Sửa trực tiếp file chi tiết của slice đó                                          | —                            |
| Thêm/sửa task ở Slice `Đang làm`     | Chỉ sửa phần chưa code; ghi lý do vào "Nhật ký thay đổi phạm vi" trong file slice | —                            |
| Thêm/sửa task ở Slice `Done`         | Giữ nguyên làm lịch sử; tạo slice sửa riêng, ghi `Thay đổi mục gốc: <id>`         | slice-2 → slice-2.1          |
| Bỏ tính năng chưa code               | Đổi trạng thái `Đã hủy`, ghi lý do, giữ nguyên dòng                               | —                            |
| Bỏ tính năng đã code                 | Tạo slice retire riêng với checklist gỡ bỏ                                        | slice-11-retire-x            |

### 22.2 Ba loại thay đổi

**Thêm tính năng:** tạo file mới trong `docs/tasks/slices/` từ `_TEMPLATE.md`, thêm 1 dòng vào `MVP-BACKLOG.md` với trạng thái `Chưa bắt đầu`, ghi ADR nếu đụng kiến trúc.

**Sửa tính năng đã có:** theo bảng 22.1, thao tác trong chính file chi tiết của slice đó, không động vào slice khác.

**Xóa tính năng:** chưa code thì đổi trạng thái `Đã hủy`; đã code thì tạo slice retire với checklist: xóa route/entry point, xóa endpoint khỏi spec và sinh lại client, xóa module và kiểm tra không còn import, xóa quyền/feature flag/chuỗi hiển thị không còn dùng, KHÔNG xóa cứng bảng dữ liệu nghiệp vụ (đánh dấu deprecated, migration đảo ngược được), ghi ADR lý do.

### 22.3 Checklist đánh giá ảnh hưởng (làm trước khi chấp nhận thay đổi)

1. Có đổi schema/migration không? Đảo ngược được không?
2. Có đổi contract/API không? Phá vỡ hay chỉ thêm?
3. Có đổi quyền/phân quyền không?
4. Có đổi cấu hình, hạn mức, hoặc điều khoản thương mại không?
5. Slice/Task nào đang phụ thuộc vào phần bị sửa?
6. Có làm vỡ mốc phạm vi đã chốt không (ví dụ vượt 2-4 task của một slice dọc)?

Nếu câu 1, 2, hoặc 3 trả lời "có" → bắt buộc ghi ADR.

### 22.4 Trạng thái được phép dùng (trong `MVP-BACKLOG.md`)

| Trạng thái    | Ý nghĩa                                       |
| ------------- | --------------------------------------------- |
| Chưa bắt đầu  | Đã lên kế hoạch, chưa có code, chưa có Owner  |
| Đang làm      | Đã có Owner và nhánh riêng                    |
| Review        | Đã mở PR, đang chờ review/auto-merge          |
| Done          | Đã merge vào `dev`, đạt đủ Definition of Done |
| Done (còn nợ) | Chạy được nhưng còn nợ kỹ thuật đã ghi        |
| Hoãn          | Có giá trị nhưng lùi lịch, ghi lý do          |
| Đã hủy        | Quyết định không làm, ghi lý do               |
| Đã thay thế   | Bị mục khác thay, ghi rõ ID thay thế          |

### 22.5 Thứ tự thao tác bắt buộc

1. Cập nhật tài liệu trước: file slice mới/sửa → `MVP-BACKLOG.md` → ADR nếu cần.
2. Sau đó mới code, và chỉ code trong phạm vi đã ghi.
3. Agent KHÔNG được tự ý đánh số lại, gộp, hay xóa mục công việc. Nếu thấy cần, đề xuất rồi chờ xác nhận.

---

## 23. Thư viện prompt chuẩn (copy khi giao việc cho AI agent)

Thay `[...]` bằng nội dung thực. Bạn không cần nêu tên nhánh; agent tự suy ra theo mục 11.6.

### 23.1 Task theo backlog

```
Đọc AGENTS.md ở gốc repo và docs/ai-workflow/README.md để nắm quy trình.
Nhiệm vụ hiện tại: [ID] trong docs/tasks/MVP-BACKLOG.md, chi tiết ở docs/tasks/slices/[ID].md.

Trước khi bắt đầu: kiểm tra cột "Phụ thuộc" của [ID] trong MVP-BACKLOG.md. Nếu phụ thuộc chưa ở trạng thái Done (đã pass review và merge vào dev), DỪNG lại, báo cho người dùng, và không code cho tới khi phụ thuộc Done.

Chỉ làm đúng phạm vi [ID], không hơn. Dừng và hỏi nếu gặp quyết định nghiệp vụ chưa chốt.
Trước khi mở PR: chạy cổng gác (AGENTS.md mục 7), đọc lại MVP-BACKLOG.md để biết slice nào khác đã merge (AGENTS.md mục 10), cập nhật AGENTS.md của feature + file slice.
Mở PR vào dev, không tự merge tay. Ngay sau khi mở PR: nhắc bắt đầu quy trình review liền, vì mọi slice phụ thuộc vào [ID] đang bị chặn cho tới khi PR này Done.
```

### 23.2 Feature/Slice/Task mới (base = dev)

```
Đọc AGENTS.md gốc + AGENTS.md con của thư mục sẽ sửa + docs/methodology/<vertical-slice|horizontal-slice>.md.
Nhiệm vụ: [mô tả].

Ràng buộc:
- base = dev, tự tạo nhánh riêng, 1 PR nhỏ.
- Chốt contract ở index.ts trước khi code, không đổi giữa chừng.
- Chỉ sửa file trong phạm vi task, import qua cửa công khai.

Trước khi mở PR: chạy cổng gác, cập nhật AGENTS.md của feature + file slice/task. Ghi ADR nếu cross-cutting.
```

### 23.3 Bugfix trên bản CHƯA release (base = dev)

```
Đọc AGENTS.md gốc + AGENTS.md con liên quan.
Lỗi trong code đang phát triển: [mô tả + cách tái hiện].

Tạo nhánh bugfix từ dev, sửa nhỏ nhất đúng lỗi, thêm test tái hiện lỗi rồi sửa cho xanh.
Chạy cổng gác, mở PR vào dev.
```

### 23.4 Hotfix production (base = main)

```
Đọc AGENTS.md gốc, mục 11.5.
Cần sửa bug trên main: [mô tả + cách tái hiện].

Tách hotfix từ main, sửa nhỏ nhất, thêm test tái hiện lỗi, chạy cổng gác.
Merge vào main, tạo tag, rồi merge main ngược về dev.
```

### 23.5 Release (đưa dev về main)

```
Đọc AGENTS.md gốc, mục 11.4.
Xác nhận: mọi Slice/Task trong dev đã Done, cổng gác xanh, migration đã kiểm tra.
Merge dev vào main (--no-ff), tạo tag, báo lại version để build từ main.
Nếu có task chưa Done trong dev, DẮNG và báo lại, không tự release.
```

### 23.6 Bàn giao / tiếp tục phiên (handoff)

```
Đọc AGENTS.md gốc mục 13 + AGENTS.md của feature đang làm + file slice/task chi tiết (mục "Bàn giao phiên gần nhất").
Tiếp tục đúng chỗ phiên trước dừng, không làm lại từ đầu.
Nếu không thấy ghi chú bàn giao rõ ràng: kiểm tra git log/diff và chạy lại cổng gác trước khi tiếp tục.
Nếu sắp hết token: commit wip, ghi đầy đủ bàn giao rồi dừng. Không mở phạm vi mới.
```

### 23.7 Thay đổi phạm vi (thêm / sửa / xóa tính năng)

```
Đọc AGENTS.md gốc, mục 22.
Yêu cầu: [thêm / sửa / xóa] tính năng: [mô tả].

Theo đúng thứ tự: tạo/sửa file slice trong docs/tasks/slices/ → cập nhật MVP-BACKLOG.md → chạy checklist 22.3, ghi ADR nếu cần → sau đó mới code.
Không tự đánh số lại hoặc xóa dòng đã có.
```

---

## Rollup trạng thái Slice/Task (cấp cao, chỉ cập nhật khi merge xong)

Không dùng mục này để theo dõi công việc đang làm dở. Nguồn sự thật cho tiến độ hàng ngày là `docs/tasks/MVP-BACKLOG.md` và `AGENTS.md` của từng feature. Bảng dưới đây chỉ thêm một dòng mới mỗi khi một Slice/Task đã merge xong vào `dev`.

| Slice/Task | Tên              | Cơ chế | Kết quả rollup | PR  | Ngày merge |
| ---------- | ---------------- | ------ | -------------- | --- | ---------- |
| slice-0    | Walking skeleton | Dọc    | Done           | 1   | 2026-09-16 |
| slice-3    | Ngân hàng câu hỏi | Dọc    | Done           | 5   | 2026-09-21 |

**Quyết định cấu trúc repo (mục 4):** [ ] Trường hợp A — [x] Trường hợp B (repo mới khởi tạo từ bộ combo, chưa có `src/`)

**Cơ chế triển khai đang dùng (mục 3):** [x] Lát cắt dọc — [ ] Lát cắt ngang — [ ] Hỗn hợp theo milestone

**Profile công nghệ áp dụng (mục 2):** [x] Web app FE+BE (`docs/methodology/webapp-template.md`) — [ ] Không áp profile nào

**Cổng gác thực tế của repo này (mục 7):** lệnh `pnpm -r build && pnpm -r lint && pnpm -r typecheck && pnpm -r test` — đã xác minh chạy được: [x] cục bộ (slice-0, 2026-09-14) [ ] CI (chờ chạy trên PR/dev)
