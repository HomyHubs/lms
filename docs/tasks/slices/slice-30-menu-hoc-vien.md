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
| TODO(slice-30) | `apps/api/src/features/students` (profile) | Nguồn "thời gian học" (giờ học quy đổi) chưa rõ công thức từ attendance/sessions | Chốt công thức với chủ dự án |

## Nhật ký thay đổi phạm vi của riêng Slice/Task này
| Ngày | Loại | Nội dung | Lý do | ADR |
| --- | --- | --- | --- | --- |
| 2026-11-12 | Tạo | Khởi tạo file slice từ yêu cầu 13.1 | Lập kế hoạch thực thi | — |

## Cách nghiệm thu
- Thủ công: menu "Học viên" hiện với admin/teacher/staff và ẩn với học viên.
- Thủ công: tìm kiếm trả đúng học viên trong phạm vi cơ sở/lớp; mở chi tiết thấy các panel có cả số và biểu đồ.
- Thủ công: `GET /students/:id/profile` trả dữ liệu tổng hợp khớp với các endpoint nguồn (reports/attendance/examhistory/exams).
- Test tự động: `apps/api/src/features/students/routes.test.ts` (tổng hợp + phân quyền + phạm vi cơ sở); component test `StudentDetailPage` (render panel + chart) và `StudentsPage` (tìm kiếm).

## Bàn giao phiên gần nhất
