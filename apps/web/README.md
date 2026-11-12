# LMS Web — Bản demo chỉ-xem (deploy Vercel)

Đây là frontend React + Vite của LMS. Ngoài chế độ chạy thật (có backend Fastify),
app hỗ trợ **chế độ demo (read-only)**: chạy hoàn toàn trên trình duyệt, **không cần
máy chủ hay cơ sở dữ liệu**, dữ liệu nạp từ **một file JSON** người dùng chọn. Phù hợp
để demo trên **Vercel** (static hosting, không có DB).

## Chế độ demo hoạt động thế nào

Toàn bộ app gọi backend qua `fetch('/api/...')`. Khi bật demo mode, một **fetch
interceptor** (`src/demo/interceptor.ts`) sẽ trả dữ liệu tổng hợp từ dataset đã nạp
thay vì gọi mạng:

- `GET /api/...` → trả dữ liệu từ file JSON (hoặc shape rỗng hợp lệ nếu thiếu).
- `GET /api/auth/me`, `POST /api/auth/login` → trả user trong dataset (role **admin**).
- Mọi thao tác ghi (`POST/PUT/PATCH/DELETE`) → **403 "chỉ xem"** (dữ liệu không đổi).

Giao diện, React Query và các màn hình **không bị sửa** — demo trông giống hệt bản thật.

Demo mode bật khi biến môi trường build `VITE_DEMO=1`. Khi không đặt biến này
(chạy dev bình thường), interceptor **tắt** và app dùng proxy `/api` → `localhost:3000`.

## Chạy demo cục bộ

```bash
# tại thư mục apps/web
# PowerShell (Windows):
$env:VITE_DEMO = "1"; pnpm dev
# bash/macOS/Linux:
VITE_DEMO=1 pnpm dev
```

Mở trình duyệt → bấm **"Dùng dữ liệu mẫu"** (nạp `public/demo-data.json`) hoặc
**"Chọn file dữ liệu"** để nạp file JSON của bạn → xem app ở quyền Admin.

Kiểm tra bản build tĩnh trước khi deploy:

```bash
pnpm build          # tsc --noEmit && vite build  → tạo dist/
pnpm preview        # xem thử bản dist/ (nhớ VITE_DEMO=1 khi build)
```

## Deploy lên Vercel

Repo là **monorepo** (pnpm + Turborepo), nên phải trỏ Vercel vào sub-app `apps/web`.

### Cấu hình project trên Vercel

| Mục | Giá trị |
| --- | --- |
| **Production Branch** (Settings → Git) | `main` |
| **Root Directory** (Settings → General) | `apps/web` |
| **Framework Preset** | Vite |
| **Build Command** | `vite build` (đã khai trong `vercel.json`) |
| **Output Directory** | `dist` |
| **Install Command** | mặc định (Vercel tự `pnpm install`) |

### Biến môi trường (Settings → Environment Variables)

| Tên | Giá trị | Môi trường |
| --- | --- | --- |
| `VITE_DEMO` | `1` | Production (và Preview nếu muốn) |

> File [`vercel.json`](./vercel.json) trong thư mục này đã cấu hình sẵn: framework Vite,
> `outputDirectory: dist`, `VITE_DEMO=1`, và SPA rewrite (mọi route → `/index.html`).
> Vì vậy thực tế chỉ cần đặt **Root Directory = `apps/web`** và chọn **Production Branch = `main`**.

### Quy trình phát hành

1. Làm việc và commit trên nhánh `dev`.
2. Merge `dev` → `main` rồi push (`git checkout main && git merge --no-ff dev && git push origin main`).
3. Vercel tự build lại từ `main`. Mở link → bấm **"Dùng dữ liệu mẫu"** → xem demo với quyền Admin.

## Cấu trúc file dữ liệu demo (`public/demo-data.json`)

Một object JSON. Bắt buộc có `me.user` với `role: "admin"`. Các key còn lại ánh xạ tới
các endpoint `GET /api/...` (interceptor đọc theo đúng các key này). Thiếu key nào thì
màn tương ứng hiển thị rỗng chứ không lỗi.

```jsonc
{
  "me": { "user": { "id": "…", "phoneNumber": "0901234567", "role": "admin" } },
  "users": [ /* AdminUser: id, phoneNumber, email, role, lastName, firstName, birthYear, gender, address, parentPhone, age, createdAt */ ],
  "centers": [ /* { id, name } */ ],
  "branches": [ /* { id, centerId, name } */ ],
  "levels": [ /* { code: "starter|mover|flyer", name } */ ],
  "courses": [ /* { id, name, … } */ ],
  "classes": [ /* { id, name, branchId, … } */ ],
  "questions": [ /* { id, levelCode, skill, questionType, options, correctAnswer, … } */ ],
  "examSets": [ /* { id, name, itemCount, status, publishedAt } */ ],
  "exams": [ /* { id, title, … } */ ],
  "gradingQueue": [ /* ManualGradingItem */ ],
  "classificationPolicies": [ /* theo từng level */ ],
  "studentReport": { /* totals, classifications, byClass, byLevel, byMonth, ranking */ },
  "examAttemptReport": { /* byExam, attempts */ },
  "examHistory": { /* attempts, nextCursor */ },
  "attendanceRates": { /* overall, students */ },
  "todayAttendanceSummary": { /* date, classes */ },
  "teachingClasses": [ /* TeachingClass */ ],
  "workHoursReport": { /* month, teachers, staff, sessions */ },
  "myTimesheet": { /* month, openShift, shifts, summary, teaching */ },
  "notifications": { "notifications": [], "unreadCount": 0 },
  "aiRequests": [],

  // Các map tra cứu theo id (interceptor lấy theo khóa):
  "enrollments":       { "<classId>":   [ /* Enrollment */ ] },
  "classSessions":     { "<classId>":   [ /* ClassSession */ ] },
  "classTeachers":     { "<classId>":   [ /* ClassTeacher */ ] },
  "sessionAttendance": { "<sessionId>": { /* SessionAttendance */ } },
  "userBranches":      { "<userId>":    [ /* Branch */ ] },
  "examSetDetails":    { "<examSetId>": { /* ExamSetDetail: items, questions */ } },
  "gradingAttempts":   { "<attemptId>": { /* attempt, items */ } }
}
```

Bạn có thể sửa `public/demo-data.json`, hoặc tạo file JSON riêng rồi dùng nút
**"Chọn file dữ liệu"** để xem dữ liệu của mình — không cần build lại.

## Các file liên quan của chế độ demo

- `src/demo/store.ts` — giữ dataset trong bộ nhớ + `sessionStorage`; cờ `isDemoMode()`.
- `src/demo/interceptor.ts` — fetch interceptor, định tuyến `GET /api/...` và chặn ghi.
- `src/demo/DemoDataLoader.tsx` — màn chọn file + nút dùng dữ liệu mẫu.
- `src/demo/DemoGate.tsx` — bọc `<App/>`, hiện loader/banner "chỉ xem".
- `public/demo-data.json` — dữ liệu mẫu.
- `vercel.json` — cấu hình build/deploy static.
