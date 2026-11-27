# Slice 25 — Ngày công & giờ dạy: chi tiết theo giáo viên và theo lớp

- Cơ chế: Dọc
- Owner hiện tại: —
- Nhánh: —
- PR: —
- Trạng thái: xem `../MVP-BACKLOG.md` (nguồn trạng thái duy nhất)
- Phụ thuộc: slice-8 (Ngày công & giờ dạy)
- Sửa mục gốc: — (tính năng mới; đặc tả mục 7)

## Mục tiêu bấm được / nghiệm thu được
- Báo cáo Ngày công & giờ dạy (Admin) giữ bộ lọc **tháng** + cơ sở, và bổ sung:
  - **Chi tiết theo giáo viên:** chọn một giáo viên → xem toàn bộ buổi học của họ trong tháng đang chọn (ngày, lớp, thời lượng, trạng thái, dạy bù/dạy thay) kèm tổng hợp số buổi/giờ.
  - **Theo lớp:** bảng giờ dạy theo từng lớp (số buổi thực dạy, số buổi nghỉ, tổng giờ) và **biểu đồ giờ dạy theo lớp**.
- Mọi số liệu lấy từ `GET /reports/work-hours` (đã có `sessions: WorkSessionDetail[]`), không tính lại từ kế hoạch, không bịa số.

## Task
| # | Task | Tầng | Ghi chú |
| --- | --- | --- | --- |
| 0 | Xác minh API đã trả đủ dữ liệu chi tiết (`report.sessions` có `className`, `durationMinutes`, `status`, `plannedTeacherPhone`, `taughtByPhone`) | API | Không thêm endpoint — slice này FE-only |
| 1 | `apps/web/src/features/workhours/work-hours-detail.ts`: hàm thuần `sessionsForTeacher(sessions, phone)` (lọc theo lịch hoặc thực dạy, sắp theo ngày) và `hoursByClass(sessions)` (tổng phút dạy/buổi nghỉ theo lớp, sắp giảm dần) | FE | Tách logic thuần để test đơn vị |
| 2 | `WorkHoursPage.tsx`: thêm select "Xem chi tiết giáo viên" + card chi tiết (tổng hợp + bảng buổi học) | FE | Trong `ReportTables` |
| 3 | `WorkHoursPage.tsx`: thêm card "Giờ dạy theo lớp" + `ReportCharts` "Biểu đồ giờ dạy theo lớp" | FE | Dùng `ReportCharts` sẵn có |
| 4 | Test: `work-hours-detail.test.ts` (2 hàm thuần) + case mới trong `WorkHoursPage.test.tsx` (card theo lớp, biểu đồ, chi tiết giáo viên) | Test | — |

## Stub cho phép
- Chưa cần xuất Excel riêng cho từng giáo viên/lớp (file Excel tháng đã có đủ sheet).
- Chưa cần phân trang danh sách buổi học.

## Không được stub
Xác thực, phân quyền, hạn mức, chuỗi hiển thị — trừ khi ghi khác trong ADR.
Ngoài ra: giờ dạy chỉ tính từ buổi đã có điểm danh (`status === 'held'`), không tính buổi theo lịch.

## Nợ kỹ thuật
| Marker | Vị trí | Nội dung | Dự kiến trả |
| --- | --- | --- | --- |
| TODO(slice-25) | `work-hours-detail.ts` | Ghép giáo viên theo SĐT vì `WorkSessionDetail` chỉ trả phone; nếu SĐT đổi giữa tháng sẽ tách dòng | Khi bổ sung `teacherId` vào `WorkSessionDetail` |
| TODO(slice-25) | `WorkHoursPage.tsx` | Bảng "Lịch dự kiến vs thực tế" vẫn hiển thị toàn bộ buổi của tháng, chưa lọc theo giáo viên đang chọn | Khi cần |

## Nhật ký thay đổi phạm vi của riêng Slice/Task này
| Ngày | Loại | Nội dung | Lý do | ADR |
| --- | --- | --- | --- | --- |
| 2026-11-26 | Tạo | Khởi tạo file slice từ yêu cầu mục 7 | Lập kế hoạch thực thi | — |

## Cách nghiệm thu
- Thủ công: chọn tháng 11/2026 → bảng "Giờ dạy theo lớp" khớp tổng giờ trong bảng giáo viên; biểu đồ theo lớp có số phút từng lớp.
- Thủ công: chọn một giáo viên ở "Xem chi tiết" → danh sách buổi khớp bảng "Lịch dự kiến vs thực tế" của chính giáo viên đó; buổi nghỉ không cộng giờ.
- Test tự động: `work-hours-detail.test.ts` + `WorkHoursPage.test.tsx`.

## Bàn giao phiên gần nhất

- 2026-11-26: Hoàn tất (FE-only).
- Thêm `work-hours-detail.ts` (`sessionsForTeacher`, `hoursByClass`) + test đơn vị 3 case.
- `WorkHoursPage.tsx`: select "Xem chi tiết giáo viên" + card "Chi tiết giáo viên" (tổng hợp + bảng buổi), card "Giờ dạy theo lớp", biểu đồ "Biểu đồ giờ dạy theo lớp" (unit phút).
- `WorkHoursPage.test.tsx` thêm case kiểm tra card theo lớp (1.5 giờ cho 90 phút), biểu đồ theo lớp, và chi tiết giáo viên theo SĐT.
- Typecheck + eslint `--max-warnings=0` PASS; toàn bộ test web PASS.
