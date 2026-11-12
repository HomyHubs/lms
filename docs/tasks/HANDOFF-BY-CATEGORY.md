# BẮT ĐẦU TỪ ĐÂY — Handoff theo danh mục (đọc nhanh)

> Mục đích: file DUY NHẤT để giao việc cho AI bot. Chỉ đọc file này + đúng 1 file slice của việc sắp làm. KHÔNG đọc lại toàn bộ repo (tốn token).
> Nguồn trạng thái chuẩn: `MVP-BACKLOG.md`. File này là bản tóm tắt điều hướng + quyết định đã chốt.
> Cập nhật: 2026-11-02

## 0. Đọc tối thiểu để bắt đầu

1. File này (trạng thái + việc cần làm tiếp + quyết định).
2. Đúng file slice của task sắp làm (cột "File chi tiết" trong bảng §2).
3. CHỈ khi cần quy tắc/cổng gác: `../../AGENTS.md`. Bỏ qua phần còn lại trừ khi task yêu cầu.

## 1. Kiến trúc 30 giây

- Monorepo pnpm + Turborepo. `apps/api` (Fastify + TS + Kysely + Postgres), `apps/web` (React 19 + Vite + Tailwind + shadcn/ui), `packages/shared` (Zod contract FE-BE), `db` (migrations dbmate).
- Mẫu 1 feature (lát cắt dọc): `shared/<f>.ts` (contract, Zod `.strict()`) → `db/migrations/*.sql` (có migrate:down) → `apps/api/src/features/<f>/{store,service,routes,index}.ts` (+ `*.test.ts`) → `apps/web/src/features/<f>/{Page.tsx,useX.ts}` + client trong `apps/web/src/lib/api.ts`.
- Cổng gác bắt buộc: `pnpm -r lint && pnpm -r typecheck && pnpm -r test`.
- 1 slice = 1 PR. Người viết code KHÔNG tự duyệt PR của mình (cần identity độc lập review).
- RBAC thực thi ở backend, không chỉ ẩn/hiện ở FE.

## 2. Trạng thái (bản tóm tắt — chuẩn ở MVP-BACKLOG.md)

| Slice | Tên | Trạng thái | Việc còn lại (ngắn) | File chi tiết |
| --- | --- | --- | --- | --- |
| slice-0 | Nền tảng & Auth | ✅ Done | — | `slices/slice-0-nen-tang-auth.md` |
| slice-1 | User / Branch / phân quyền | 🔍 Review (PR#3) | Merge vào `dev` | `slices/slice-1-user-branch-phan-quyen.md` |
| slice-2 | OTP đa kênh | 🚧 Code xong, chưa PR | Xem DANH MỤC A | `slices/slice-2-otp-da-kenh.md` |
| slice-3 | Ngân hàng câu hỏi + import | ✅ Done | — | `slices/slice-3-ngan-hang-cau-hoi.md` |
| slice-4 | Tạo đề & Thi online | 🔍 Review (PR#6) | migrate DB thật + merge | `slices/slice-4-tao-de-thi-online.md` |
| slice-4.5 | Sinh prompt AI + import ngược | ⬜ Chưa bắt đầu | Xem DANH MỤC B | `slices/slice-4.5-sinh-prompt-ai-import.md` |
| slice-5 | Chấm điểm tự động & Thi lại | ⬜ Chưa bắt đầu | Xem DANH MỤC C | `slices/slice-5-cham-diem-thi-lai.md` |
| slice-6 | Điểm danh | ⬜ Chưa bắt đầu | Xem DANH MỤC D | `slices/slice-6-diem-danh.md` |
| slice-7 | Xếp loại & Dashboard | ⬜ Chưa bắt đầu | Xem DANH MỤC E | `slices/slice-7-xep-loai-dashboard.md` |
| slice-8 | Ngày công & giờ dạy | ⬜ Chưa bắt đầu | Xem DANH MỤC F | `slices/slice-8-ngay-cong-gio-day.md` |
| slice-9 | Mở rộng Speaking/Writing + thông báo | ⏸️ Hoãn (không làm MVP) | — | `slices/slice-9-mo-rong.md` |

## 3. ĐANG LÀM

- **slice-2 (OTP đa kênh):** code + test xong cục bộ, cổng gác xanh, CHƯA mở PR. Owner: An Vo. → chuyển sang DANH MỤC A.
- **slice-1, slice-4:** đang Review, cần merge vào `dev` để mở khóa các slice phụ thuộc.

## 4. CẦN LÀM TIẾP — theo danh mục

Mỗi mục chỉ ghi "điểm vào" + việc chính. Chi tiết task/nghiệm thu nằm trong file slice tương ứng.

### DANH MỤC A — Xác thực & OTP (hoàn tất slice-2)
Phụ thuộc: slice-1 merge trước (rebase `dev`).
1. Rebase `feature/slice-2-otp-da-kenh` lên `dev`.
2. **Chỉ làm kênh Email** (đã có từ slice-0) — xem Quyết định §5. Bỏ WhatsApp. Telegram đã có code, chỉ bật nếu có bot token.
3. Chạy `dbmate migrate` + test rollback `20260920000000_otp_channel_field.sql` trên Postgres thật.
4. Mở PR vào `dev`, review độc lập, merge, cập nhật backlog.
- KHÔNG stub: rate-limit endpoint OTP/login phải thật.

### DANH MỤC B — Ngân hàng câu hỏi & AI (slice-4.5)
Phụ thuộc: slice-3 (Done). Hệ thống KHÔNG gọi AI provider trực tiếp.
- Luồng: sinh prompt theo Question Import Schema → copy ra AI ngoài → dán/upload kết quả → validate strict (tái dùng slice-3) → hàng chờ duyệt (`draft→imported→reviewed→saved_to_bank`) → lưu vào bank với `source: ai_generated`.
- KHÔNG stub: validate schema trước khi vào hàng chờ; không lưu thẳng bỏ qua duyệt.

### DANH MỤC C — Chấm điểm & Thi lại (slice-5)
Phụ thuộc: slice-4 Done.
- Chấm tự động trắc nghiệm/điền từ theo đáp án; pass/fail theo ngưỡng **cấu hình được** theo cấp độ/khóa; tự tạo lượt thi lại (đề mới random, giới hạn số lần, thời gian chờ); lưu lịch sử `ExamAttempt` để audit.
- KHÔNG stub: logic pass/fail + giới hạn số lần thi lại. Câu tự luận/Speaking đánh dấu `TODO(slice-9)`.

### DANH MỤC D — Điểm danh (slice-6)
Phụ thuộc: slice-1.
- Giáo viên điểm danh theo buổi (có mặt/vắng/trễ/nghỉ phép) — chỉ lớp mình dạy (RBAC thật ở backend); học viên/Admin xem lịch sử; tính tỷ lệ chuyên cần (đầu vào cho slice-7).

### DANH MỤC E — Xếp loại & Dashboard (slice-7)
Phụ thuộc: slice-5 + slice-6.
- **Công thức xếp loại đã chốt: điểm thi 90% + chuyên cần 10%, cấu hình đổi được về sau** (§5).
- Dashboard biểu đồ điểm/đạt-trượt theo lớp/cấp độ/thời gian (chỉ Branch được gán); bảng xếp hạng + tiến độ thi lại; export Excel/PDF.

### DANH MỤC F — Ngày công & Giờ dạy (slice-8)
Phụ thuộc: slice-1 + slice-6.
- Chấm công nhân viên; tự tính giờ dạy GV **từ điểm danh thực tế** (chỉ buổi đã diễn ra + GV có mặt); đối chiếu lịch dự kiến vs thực tế (dạy bù/nghỉ/dạy thế); báo cáo giờ công theo kỳ lương + xuất file.
- KHÔNG stub: giờ dạy tính từ điểm danh thực tế, không theo lịch dự kiến thuần.

### DANH MỤC G — Nền tảng / DevOps / Nợ chung (xuyên suốt)
- Chạy `dbmate migrate` + test rollback TẤT CẢ migration trên Postgres thật (nợ kế thừa slice-0→4).
- Cắm provider email thật cho OTP (TODO trong `apps/api/src/features/auth/email.ts`).
- CI (`.github/workflows/ci.yml`) chạy đủ lint+typecheck+test mỗi PR.
- Mỗi slice: cập nhật `MVP-BACKLOG.md` + file slice + `AGENTS.md` feature TRONG CÙNG PR.

## 5. Quyết định đã chốt (chủ sở hữu, 2026-11-02)

- **slice-7 — trọng số xếp loại:** điểm thi **90%** + chuyên cần **10%**; phải để **cấu hình đổi được** về sau.
- **OTP (slice-2/9):** KHÔNG dùng WhatsApp (không có tài khoản). Kênh chính = **Email**. Telegram đã có code, bật nếu có bot token.
- **slice-9:** KHÔNG làm cho MVP → **Hoãn**. (Nội dung slice-9 còn mơ hồ, cần làm rõ lại nếu sau này cần.)

## 6. Khi làm xong 1 task

1. Cổng gác xanh: `pnpm -r lint && pnpm -r typecheck && pnpm -r test`.
2. Cập nhật §2/§3 file này + `MVP-BACKLOG.md` + file slice.
3. Mở PR, review độc lập, merge vào `dev`.
