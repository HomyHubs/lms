# Task hiện tại (chỉ dùng khi làm tuần tự một mình)

Phạm vi sử dụng: chỉ dùng khi đúng một người/agent làm tuần tự.

## Đang làm

- ID Slice/Task: không còn slice nào mở trong backlog (slice-9 đã **hủy** 2026-11-26 — xem bên dưới).
- Cập nhật ngày: 2026-11-27
- Nhánh: `dev` (đã merge vào `main`)
- Trạng thái: Release `dev` → `main` (`196be90`) — Dependabot 130 cảnh báo → **0**. Không còn task nghiệp vụ mở; chỉ còn việc kiểm thử tay + nợ kỹ thuật có marker.

### Việc trước đó

- ID Slice/Task: vá cổng gác CI + 2 lỗi thật lộ ra khi chạy integration test (ADR 0017)
- Cập nhật ngày: 2026-11-26
- Nhánh: `dev`
- Trạng thái: Done — `dev-health-check` xanh với đủ 304 test (trước: 282 pass + 22 skip).

## Đã làm (phiên 2026-11-27)

- **Merge `dev` → `main` (`196be90`)**: `main` thiếu 63 commit của `dev` và có 9 commit deploy riêng → merge `--no-ff`, không xung đột. Giữ nguyên phần chỉ có trên `main`: root `vercel.json` vẫn đã xoá (`008247f`), `apps/web/vercel.json` không đổi. Lockfile/workspace lấy bản của `dev` (vite 7.3.8, vitest 4.1.12, kysely 0.28.17, minimatch 11.0.9).
- Cổng gác trên cây đã merge: lint 4/4, typecheck 5/5, test shared 17 + api 282 (+22 integration skip vì máy local không có `TEST_DATABASE_URL`) + web 113, build OK; chạy thêm đúng lệnh Vercel (`VITE_DEMO=1 vite build`) → OK.
- **Dependabot về 0**: graph cập nhật ngay sau push, nhưng alerts treo 130 suốt ~33 phút rồi tự đóng (`open=0`, `fixed=130`). Không cần tắt/bật lại Dependabot; job tính lại alert chạy bất đồng bộ tới ~30-40 phút.
- **Trả nợ `TODO(slice-16)`**: chủ dự án chốt cột "Tổng số học viên" gom **theo cấp độ** (Starter/Mover/Flyer), chi tiết khóa học nằm trong tooltip. Thêm `apps/web/src/features/home/dashboard-stats.ts` (hàm thuần `buildStudentsByLevel`), `StudentsByLevelChart` + `LevelBarTooltip` trong `DashboardCharts.tsx`, màu cố định theo cấp (`LEVEL_COLORS`); bỏ `studentsByCourse` khỏi `useDashboardStats` vì hết nơi dùng. Test: `dashboard-stats.test.ts` 6 case + cập nhật `DashboardCharts.test.tsx`.
- **Trả nợ `TODO(slice-30)` — đồng bộ công thức xếp loại**: tách `finalScore`/`classify`/`passed` sang `apps/api/src/platform/grading.ts` (reports re-export để không phá import cũ); `attendance/service.ts` thêm `ratePercentFromCounts` dùng chung. Hồ sơ học viên giờ theo đúng ADR 0006: điểm thi = trung bình điểm cao nhất **mỗi đề** (SQL `max` theo `exam_id`), chuyên cần loại vắng CÓ PHÉP khỏi mẫu số, `finalScore` có trọng số theo policy cấp độ, `classify` theo ngưỡng policy thay vì 90/75/50 cứng. Thêm `students/store.integration.test.ts` (5 case trên Postgres thật) vì phần SQL này không thể kiểm bằng unit test.


## Đã làm (phiên 2026-11-26)

- Trả nợ slice-17: `components/ui/date-picker.tsx` (calendar popover in-house) thay `<input type="date">`; test lọc ngày trong `AttendancePage.test.tsx` (stub đúng schema `TodayClassSummary` có `startsAt`). slice-17 → Done.
- Đồng bộ backlog với git log: slice-23 (#39), slice-30 (#40), slice-1.1 (#38), slice-6.1 (3185e7d), slice-10.1 (#34) → Done; thêm dòng chỉ mục cho `slice-10.1` và `slice-dashboard-movements`.
- slice-27: sửa inline trung tâm/cơ sở (FE + api `updateCenter`/`updateBranch`, hook, test).
- slice-28: chặn xoá lớp còn học viên (409), `LevelRoadmap` (Starter→Mover→Flyer), cột khoá học, test API + FE.
- slice-29: trang "Ghi danh & Quản lý" 2 panel (HV/GV theo lớp, quản lý theo cơ sở), đổi nhãn menu, test.
- slice-25: `work-hours-detail.ts` (thuần) + chi tiết theo giáo viên, bảng/biểu đồ giờ dạy theo lớp, test.
- slice-dashboard-movements phần 3: rà 4 nhóm báo cáo; bổ sung biểu đồ thanh + tròn cho điểm danh (`TodayBarChart` theo ngày đang chọn, `TodayAttendanceBoard` theo bộ lọc cơ sở) + test đổi theo bộ lọc.
- slice-dashboard-movements phần 4: xác minh đã triển khai từ `d6190a3` (admin chấm công thay GV, `recorded_by` + `now()` trong `shift_events`, unique index chống trùng ca, 404 ngoài phạm vi, lịch sử thời điểm + người thao tác) — chỉ cập nhật tài liệu, không cần code thêm.
- Gia cố slice-30: `studentCode` lấy thật từ `users.student_code` (hết hardcode `null`), tìm kiếm theo mã học viên, panel "Thời gian học" (`study`: số buổi + tổng phút, chỉ tính buổi `present`/`late`), cột "Mã HV" ở danh sách; thêm `routes.test.ts` (14 case) + component test `StudentsPage` (3) / `StudentDetailPage` (3); stub `ResizeObserver` toàn cục trong `src/test/setup.ts` để recharts chạy được dưới jsdom.
- Cổng sau gia cố: API typecheck + eslint sạch, 282 pass / 22 skip; Web typecheck + eslint sạch, 113 pass; `vite build` OK (cảnh báo chunk >500 kB là có sẵn).
- **Hủy `slice-9`** theo quyết định chủ sở hữu: bỏ hẳn chấm bán tự động; audio/ghi âm cho Listening/Speaking **không xây trong LMS** — giáo viên tự chấm và đưa kết quả vào lớp bằng luồng đã có (`slice-9a` chấm tay/import Excel + `slice-22` đưa điểm vào lớp). Trạng thái backlog `Hoãn` → `Đã hủy`; gỡ marker `TODO(slice-9)` ở migration `20260921000000_questions.sql` và 4 slice doc (`slice-3`, `slice-5`, `slice-6`, `slice-12`); cập nhật ADR 0003/0013, `AGENTS.md`, `HANDOFF-BY-CATEGORY.md`, `design/ui-reference.md`. Không sửa code nghiệp vụ.
- **Vá lỗ hổng phụ thuộc (ADR 0016)**: `pnpm audit` 82 advisory (5 critical, 28 high) → **0**. Nâng `fastify` 5.0.0→5.12.8, `kysely` 0.27.4→0.28.17, `react-router-dom` 7.1.1→7.18.7, `zod` 3.23.8→4.6.7; `vite` 5.4.8→7.3.8, `@vitejs/plugin-react` 4.3.2→5.2.0, `vitest` 2.1.2→4.1.12, `postcss` 8.4.47→8.5.33, `turbo` 2.1.3→2.11.13, `tsx` 4.19.1→4.23.15; ghim phụ thuộc gián tiếp trong `pnpm-workspace.yaml` (pnpm 11 bỏ `pnpm.overrides` ở `package.json`). Sửa kèm: 7 chỗ `invalid_type_error`→`error` (zod 4 bỏ tham số này), 142 UUID fixture không đúng RFC 4122 (zod 4 kiểm tra version/variant chặt), thêm `vitest.config.ts` cho `apps/api` và `packages/shared` để Vitest 4 không nhặt `dist/**/*.test.js` (gây chạy test 2 lần: API 282→564).
- **Vá cổng gác CI (ADR 0017)**: `dev-health-check.yml` thêm Postgres thật + `dbmate up` + `TEST_DATABASE_URL` để 22 test tích hợp không bị skip. Khi bật lên thì lộ 2 lỗi có sẵn: (1) **2 cặp migration trùng version** (`20261115000000`, `20261120000000`) làm `dbmate up` chết trên DB mới → đổi tên file thứ hai sang `...0001` (cả hai đều idempotent); (2) `examhistory/store.ts#selectScopedAttempts` thiếu `e.ended_at is null` nên báo cáo theo cơ sở/lớp vẫn tính lượt thi của học viên đã nghỉ (trái spec slice-1.1) → đã thêm filter. `ci.yml` trên PR đã đỏ từ 2026-11-21 vì đúng lỗi migration này. Thêm nữa: integration test dùng chung DB `lms_test` nên **không được chạy song song** (lần chạy thứ 2 fail 5 test do timeout 5s/10s) → tách `apps/api/vitest.config.ts` thành 2 project, `integration` chạy tuần tự với timeout 30s. Đã xác nhận xanh 2 lần liên tiếp.

## Bước tiếp theo

1. ~~Chạy cổng gác đầy đủ `pnpm -r build && pnpm -r lint && pnpm -r typecheck && pnpm -r test` trên `dev` trước khi release.~~ **Đã chạy 2026-11-26: build 3/3, lint 4/4, typecheck 5/5, test 5/5 — tất cả PASS.** Từ 2026-11-26 `dev-health-check` chạy đủ **304 test** trên Postgres thật (không còn 22 skip).
2. Kiểm tra giao diện thật trên trình duyệt/màn hình hẹp cho các biểu đồ mới (mới chỉ test jsdom — `ResponsiveContainer` không đo được kích thước trong jsdom nên test chỉ assert số liệu/nhãn).
3. ~~`slice-9` vẫn Hoãn — cần chủ dự án chốt phạm vi.~~ **Đã chốt 2026-11-26: hủy slice-9.**
4. Cân nhắc mở PR cho các commit trực tiếp trên `dev` nếu repo chuyển sang luồng review bắt buộc.
5. Đồng bộ công thức xếp loại học lực giữa `students/service.ts` và `reports/service.ts` khi slice-7 chốt (đang ghi nợ `TODO(slice-30)`).
6. (Tùy chọn, ngoài phạm vi slice) Bundle web còn 1 chunk ~1.06 MB — có thể `manualChunks` tách recharts/vendor nếu muốn hết cảnh báo >500 kB.
7. Nếu sau này cần nhắc điểm danh tự động hoặc audio trong LMS: **mở slice mới** (ID slice-9 không tái sử dụng), trả lời 3 câu ở mục "Nếu sau này muốn mở lại" trong `slices/slice-9-mo-rong.md`.
8. ~~Sau khi push, mở lại trang Dependabot của repo để xác nhận GitHub đã đóng cảnh báo.~~ **Đã xác nhận 2026-11-27: `open=0`, `fixed=130`.**
9. Kiểm thử tay trên trình duyệt sau khi nâng Vite 7 / vitest 4 / zod 4: luồng tạo đề (parse body số câu/thời lượng), trang báo cáo, và dev server `pnpm dev` (Vite 7 đổi một số mặc định về `server.fs`).
10. Bộ ba `vite` 7 / `vitest` 4 / `zod` 4.6 còn rất mới — nếu gặp lỗi lạ khi dev, nghi vấn đầu tiên nên là chúng. Đường lùi: revert commit vá phụ thuộc rồi `pnpm install` (lockfile đi kèm commit).
