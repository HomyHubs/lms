# Slice/Task slice-12.3 — Hình câu hỏi ở màn chấm tay (thay đổi slice-12)

- Cơ chế: Dọc
- Owner hiện tại: An Vo
- Nhánh: `feature/slice-12.3-grading-images`
- Trạng thái: xem `../MVP-BACKLOG.md`
- Phụ thuộc: slice-12, slice-9a
- Sửa mục gốc: slice-12 (mục “Ảnh ở màn chấm tay” đã Hoãn)

## Mục tiêu bấm được / nghiệm thu được

Giáo viên chấm bài Speaking/Writing thấy hình của đề bài ngay trên màn chấm (bấm để phóng to).

## Task

| # | Task | Tầng | Ghi chú |
| --- | --- | --- | --- |
| 1 | `GradingPage`: hiện `stemImages` dưới đề bằng `ExamImage` (alt “Hình câu N”). | web | API chấm tay đã trả `stemImages` (dùng chung `toQuestionView`); câu chấm tay không có lựa chọn nên không hiện `optionImages` |

## Stub cho phép

Không.

## Không được stub

Không đổi API/DB. Ảnh vẫn đi qua `GET /api/media/:id` có kiểm quyền (ADR 0013).

## Nợ kỹ thuật

| Marker | Vị trí | Nội dung | Dự kiến trả |
| --- | --- | --- | --- |

## Nhật ký thay đổi phạm vi của riêng Slice/Task này

| Ngày | Loại | Nội dung | Lý do | ADR |
| --- | --- | --- | --- | --- |
| 2026-11-14 | Thêm | Tạo task theo mục 22 từ mục slice-12 đã Hoãn | Owner đồng ý 3 slice kế tiếp | — |

## Cách nghiệm thu

1. Chèn hình cho một câu Writing, phát hành, học viên nộp bài.
2. Giáo viên mở “Chấm bài” → “Chấm” → thấy hình dưới đề, bấm phóng to.
3. Gates PASS.

## Bàn giao phiên gần nhất

**2026-11-14 — An Vo (agent)**

- Đã xong: Task 1; mở rộng test `GradingPage.test.tsx` (câu có hình / không hình).
- Chưa: nghiệm thu tay.
