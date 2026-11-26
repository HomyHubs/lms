# Slice 30 — Menu Học viên (mới)

- Cơ chế: Dọc
- Owner hiện tại: —
- Nhánh: —
- PR: —
- Trạng thái: xem `../MVP-BACKLOG.md` (nguồn trạng thái duy nhất)
- Phụ thuộc: slice-13 (Lịch sử thi & báo cáo thi), slice-5 (Chấm điểm & thi lại), slice-6 (Điểm danh)
- Sửa mục gốc: — (tính năng mới; đặc tả mục 13.1)

## Mục tiêu bấm được / nghiệm thu được
- Có menu mới "Học viên" (cho admin/teacher/staff) mở trang tìm kiếm học viên.
- Chọn một học viên mở trang chi tiết hồ sơ toàn diện: điểm số, thời gian học, chuyên cần, thi, tỉ lệ học lực...
- Mỗi nhóm thông tin là một panel riêng, có cả số (KPI) và biểu đồ.
- Toàn bộ read-only, tổng hợp từ dữ liệu đã có; không nhập/sửa dữ liệu nghiệp vụ ở slice này.

## Task
| # | Task | Tầng | Ghi chú |
| --- | --- | --- | --- |
| 1 | Tạo feature API mới `apps/api/src/features/students` với endpoint tổng hợp `GET /students/:id/profile` trả hồ sơ gộp (thông tin cá nhân, điểm, thời gian học, chuyên cần, thống kê thi, xếp loại) | API | Endpoint MỚI cần thêm ở feature `students` (API) |
| 2 | Thêm `GET /students?q=` tìm học viên theo tên/mã/SĐT, giới hạn theo cơ sở/lớp của người dùng; mở cho admin/teacher/staff | API | `GET /users` hiện chỉ cho admin, nên cần endpoint tìm kiếm riêng cho teacher/staff |
| 3 | `apps/api/src/features/students/store.ts` tái dùng tối đa store/endpoint đã có (gọi qua cửa công khai, không nhân bản truy vấn): reports `GET /reports/students` (xếp loại học lực); examhistory `GET /students/:id/exam-attempts`, `GET /reports/exam-attempts`; attendance `GET /attendance/students/:id`, `GET /attendance/rates`; exams/grading `GET /exams/:id/results` | API | Tái dùng reports/attendance/examhistory/exams |
| 4 | Tạo feature web MỚI `apps/web/src/features/students`: `StudentsPage.tsx` (ô tìm kiếm + danh sách kết quả) và `StudentDetailPage.tsx` (các panel) | FE | Feature web mới |
| 5 | `apps/web/src/features/students/useStudentProfile.ts` + `useStudentSearch.ts` dùng `@tanstack/react-query` (`useQuery({ queryKey, queryFn })`), theo mẫu `apps/web/src/features/users/useUsers.ts` và `apps/web/src/features/home/useDashboardStats.ts` | FE | Mẫu hook đã có sẵn trong repo |
| 6 | Mỗi panel là một khối: KPI số + biểu đồ recharts theo mẫu `apps/web/src/features/home/DashboardCharts.tsx` (`ResponsiveContainer` + `BarChart`/`PieChart`). Panel: Điểm số, Thời gian học, Chuyên cần, Kết quả thi, Xếp loại học lực | FE | recharts 2 đã dùng ở dashboard |
| 7 | Thêm hàm `getStudentProfile(id)` và `searchStudents(q)` vào `apps/web/src/lib/api.ts` theo mẫu `fetch('/api/...', { credentials: 'include' })` | FE | File dùng chung — xem Integration notes |
| 8 | Thêm route `/students` vào `apps/web/src/App.tsx` (map `PAGES['/students']` + bọc `RequireAuth role`) và mục menu `{ path: '/students', label: 'Học viên', icon, tone, roles: ['admin','teacher','staff'] }` vào `apps/web/src/components/layout/nav.ts` | FE | File dùng chung — xem Integration notes |

## Stub cho phép
- Panel chưa có nguồn dữ liệu đầy đủ (ví dụ "thời gian học" nếu attendance chưa quy đổi ra giờ) có thể hiển thị khung panel + nhãn "đang cập nhật", nhưng tuyệt đối không bịa số.
- `GET /students/:id/profile` có thể trả từng phần (partial); FE render trước những panel đã có dữ liệu.

## Không được stub
Xác thực, phân quyền, hạn mức, chuỗi hiển thị — trừ khi ghi khác trong ADR.
Ngoài ra: số liệu các panel phải lấy thật từ store/endpoint hiện có, không hardcode.

## Nợ kỹ thuật
| Marker | Vị trí | Nội dung | Dự kiến trả |
| --- | --- | --- | --- |
| TODO(slice-30) | `apps/api/src/features/students/store.ts` | Gọi lặp nhiều store có thể gây N+1 khi dữ liệu học viên lớn; cần gộp/tối ưu truy vấn | Khi đo thấy chậm thực tế |
| ~~TODO(slice-30)~~ | `apps/api/src/features/students` (profile) | ~~Nguồn "thời gian học" chưa rõ công thức~~ → **đã chốt 2026-11-26**: chỉ tính buổi `present`/`late`, phút học = `sum(class_sessions.duration_minutes)` | Đã trả |
| TODO(slice-30) | `apps/api/src/features/students/service.ts` (`toClassificationPanel`) | Xếp loại đang dùng điểm thi trung bình làm điểm tổng tạm thời; công thức đầy đủ (trọng số thi/chuyên cần) thuộc slice-7 | Khi chốt công thức xếp loại |

## Nhật ký thay đổi phạm vi của riêng Slice/Task này
| Ngày | Loại | Nội dung | Lý do | ADR |
| --- | --- | --- | --- | --- |
| 2026-11-12 | Tạo | Khởi tạo file slice từ yêu cầu 13.1 | Lập kế hoạch thực thi | — |
| 2026-11-26 | Bổ sung | Gia cố sau khi slice-23 (mã học viên) merge: `studentCode` lấy thật từ `users.student_code` (trước đó hardcode `null`), thêm tìm kiếm theo mã, thêm panel "Thời gian học" (`study`: số buổi + tổng phút) và cột "Mã HV" ở danh sách | Slice-23 đã có mã học viên nên không được để `null` giả; panel thời gian học là yêu cầu 13.1 còn thiếu | ADR 0014 |

## Cách nghiệm thu
- Thủ công: menu "Học viên" hiện với admin/teacher/staff và ẩn với học viên.
- Thủ công: tìm kiếm trả đúng học viên trong phạm vi cơ sở/lớp; mở chi tiết thấy các panel có cả số và biểu đồ.
- Thủ công: `GET /students/:id/profile` trả dữ liệu tổng hợp khớp với các endpoint nguồn (reports/attendance/examhistory/exams).
- Test tự động: `apps/api/src/features/students/routes.test.ts` (tổng hợp + phân quyền + phạm vi cơ sở); component test `StudentDetailPage` (render panel + chart) và `StudentsPage` (tìm kiếm).

### Trạng thái nghiệm thu (2026-11-26)
- [x] `apps/api/src/features/students/routes.test.ts` — 14 test: 401 khi chưa đăng nhập (2 endpoint), 200 cho admin/teacher/staff, 403 cho student, 400 khi thiếu từ khoá, branch-scope (admin chỉ thấy cơ sở được gán, ngoài phạm vi → 404), superadmin vượt scope, hồ sơ đầy đủ/trống, tìm theo mã học viên, 404 khi không tồn tại.
- [x] `apps/api/src/features/students/service.test.ts` — 17 test: map panel (thi/chuyên cần/thời gian học/xếp loại), ngưỡng xếp loại (`it.each` 90/75/50), dữ liệu cũ chưa có mã học viên.
- [x] `apps/web/src/features/students/StudentsPage.test.tsx` — 3 test: tìm kiếm + cột "Mã HV" (`—` khi null), gửi từ khoá đã trim + mở hồ sơ khi bấm dòng, trạng thái lỗi.
- [x] `apps/web/src/features/students/StudentDetailPage.test.tsx` — 3 test: render đủ 4 panel + mã HV/cơ sở/cấp độ, hồ sơ trống hiện nhãn "Chưa có…", 404 hiện thông báo không có quyền.
- [ ] Thủ công trên trình duyệt thật (chưa chạy): biểu đồ recharts cần kiểm tra hiển thị thực tế — trong jsdom `ResponsiveContainer` không đo được kích thước nên test chỉ assert số liệu/nhãn.

## Bàn giao phiên gần nhất

**2026-11-26 — gia cố slice-30 (hoàn tất phần code + test, chờ kiểm tra thủ công)**

Đã làm:
- `packages/shared/src/students.ts`: thêm `StudentStudyPanel` (`sessionsAttended`, `studyMinutes`) và field `study` trên `StudentProfile`.
- `apps/api/src/features/students/service.ts`: `StudentSearchRow`/`StudentIdentityRow` có `student_code`; thêm `StudentStudyAggRow` + `loadStudyAgg` vào `StudentsStore`; `toStudyPanel()`; `studentCode` lấy từ `identity.student_code` (hết hardcode `null`); `loadStudentProfile` chạy song song 3 truy vấn tổng hợp.
- `apps/api/src/features/students/store.ts`: select `u.student_code` ở cả hai truy vấn, tìm kiếm thêm theo mã (`lower(coalesce(u.student_code,'')) like`), `loadStudyAgg` cộng `class_sessions.duration_minutes` cho các buổi `present`/`late`.
- `apps/web/src/features/students/StudentsPage.tsx`: cột "Mã HV" (`font-mono`, `—` khi null).
- `apps/web/src/features/students/StudentDetailPage.tsx`: card "Thời gian học" (số buổi + `hoursLabel(studyMinutes)`) và mã HV trong dòng mô tả dưới tiêu đề.
- Test: `routes.test.ts` (mới, 14 case), `service.test.ts` (mở rộng lên 17 case), `StudentsPage.test.tsx` (mới, 3 case), `StudentDetailPage.test.tsx` (mới, 3 case).
- `apps/web/src/test/setup.ts`: stub `ResizeObserver` no-op toàn cục (jsdom thiếu, recharts ném lỗi làm fail cả file dù assertion pass).

Cổng đã chạy: API typecheck + eslint `--max-warnings=0` sạch, 282 pass / 22 skip; Web typecheck + eslint sạch, 113 pass; `vite build` OK.

Còn lại: kiểm tra thủ công biểu đồ trên trình duyệt; công thức xếp loại đầy đủ chờ slice-7.
