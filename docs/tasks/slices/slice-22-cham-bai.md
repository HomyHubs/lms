# Slice 22 — Chấm bài (mục 5.2, 5.3)

- Cơ chế: Dọc
- Owner hiện tại: Hoang Hoang HA
- Nhánh: feature/slice-22-cham-bai
- PR: —
- Trạng thái: xem `../MVP-BACKLOG.md` (nguồn trạng thái duy nhất, không ghi trùng ở đây để tránh lệch)
- Phụ thuộc: slice-5 (chấm điểm & thi lại), slice-9a (chấm tay + import bảng điểm Excel)
- Sửa mục gốc: —

## Mục tiêu bấm được / nghiệm thu được

- Giáo viên/Admin mở màn Chấm bài (`apps/web/src/features/grading/GradingPage.tsx`):
  - Có **link tải file mẫu** điểm (giống `public/templates/` của slice-11b) để điền điểm ngoài rồi import.
  - Có **nút "Bắt đầu chấm"** rõ ràng cho bài Speaking/Writing chờ chấm.
  - **Sửa được kết quả** đã chấm (điểm + nhận xét) trước khi chốt.
  - **Đưa điểm vào lớp** từ file import, nhưng phải có **bước xem trước (preview)** trước khi ghi — theo đúng mô hình 2 bước preview→commit đã dùng ở slice-11b (`/exam-sets/import/{preview,commit}`): preview KHÔNG ghi DB, commit validate lại all-or-nothing.

## Task

| # | Task | Tầng | Ghi chú |
| --- | --- | --- | --- |
| 1 | **Preview import điểm (5.3).** Thêm bước xem trước cho `grade-import`: endpoint preview trả bảng {dòng, học viên, điểm, cảnh báo, lỗi} mà KHÔNG ghi DB; chỉ `commit` mới ghi. | API | `apps/api/src/features/exams/grade-import.ts`, `exams/routes.ts`, `exams/service.ts`. Theo mẫu examsets import preview/commit. |
| 2 | **File mẫu + link tải (5.3).** Tạo file mẫu điểm trong `apps/web/public/templates/` + link tải trên `GradingPage`. | FE | Giống `mau-bo-de.{xlsx,csv}` của slice-11b. |
| 3 | **Nút "Bắt đầu chấm" + sửa kết quả (5.2).** `GradingPage.tsx`: nút bắt đầu chấm bài chờ; form sửa điểm + nhận xét cho kết quả đã chấm; gọi hook trong `useGrading.ts`. | FE | Giữ RBAC: chỉ GV phụ trách/Admin (slice-1 scope). |
| 4 | **UI preview import + xác nhận (5.3).** Bảng xem trước OK/Cảnh báo/Lỗi; nút "Xác nhận đưa vào lớp" khoá khi có lỗi. | FE | Dùng `Card`/`PageHeader`, phong cách shadcn/Tailwind hiện có. |
| 5 | **Shared type.** Bổ sung type preview/commit cho grade-import ở `packages/shared` nếu cần (vd `GradeImportPreview`). | Shared | Tái dùng pattern `exam-set-import.ts`. |
| 6 | **Test + cổng gác.** Unit test service preview/commit (all-or-nothing, 1 dòng sai → 400, không ghi); test UI GradingPage (preview, khoá nút khi lỗi, sửa kết quả). Chạy typecheck/lint/test cho web + api. | Test | — |
| 7 | **AGENTS.md feature.** Cập nhật nhật ký ở `apps/web/src/features/grading/` và `apps/api/src/features/exams/` (phần grade-import). | Docs | Theo mẫu `docs/templates/feature-AGENTS.template.md`. |

## Stub cho phép

- Có thể giữ bảng preview dạng bảng HTML/CSS đơn giản, chưa cần component bảng nâng cao.
- Định dạng file mẫu tối thiểu: cột mã/SĐT học viên + điểm (+ nhận xét tuỳ chọn).

## Không được stub

Xác thực, phân quyền (GV chỉ chấm lớp mình phụ trách — slice-1), hạn mức file, chuỗi hiển thị. Import phải all-or-nothing (một dòng sai → không ghi gì), preview không được ghi DB.

## Nợ kỹ thuật

| Marker | Vị trí | Nội dung | Dự kiến trả |
| --- | --- | --- | --- |
| | | | |

## Nhật ký thay đổi phạm vi của riêng Slice/Task này

| Ngày | Loại | Nội dung | Lý do | ADR |
| --- | --- | --- | --- | --- |
| 2026-11-14 | Thêm | Tạo file chi tiết slice | Scaffold slice-22 (Chấm bài): link mẫu, nút bắt đầu chấm, sửa kết quả, đưa điểm vào lớp + preview trước import (mục 5.2, 5.3) | — |

## Cách nghiệm thu

1. GV/Admin mở màn Chấm bài → thấy link tải file mẫu, nút "Bắt đầu chấm", danh sách bài chờ chấm.
2. Chấm/sửa một kết quả Speaking/Writing → điểm + nhận xét lưu đúng; học lực/điểm tổng cập nhật theo.
3. Tải file mẫu, điền điểm, upload → thấy bảng **xem trước** (OK/Cảnh báo/Lỗi); nút xác nhận bị khoá khi có lỗi; sửa cho hết lỗi rồi xác nhận → điểm vào lớp (all-or-nothing).
4. Thử file có 1 dòng sai → preview báo lỗi, xác nhận bị chặn, không có điểm nào được ghi.

## Bàn giao phiên gần nhất

Điền theo mẫu `../../ai-workflow/templates/session-handoff.md` khi dừng giữa chừng.
