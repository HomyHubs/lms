# Slice 28 — Chương trình học: tạo lớp theo cơ sở, chặn xoá lớp còn học viên, sơ đồ lộ trình cấp độ

- Cơ chế: Dọc
- Owner hiện tại: —
- Nhánh: —
- PR: —
- Trạng thái: xem `../MVP-BACKLOG.md` (nguồn trạng thái duy nhất)
- Phụ thuộc: slice-1 (User, Branch & phân quyền)
- Sửa mục gốc: — (tính năng mới; đặc tả mục 11)

## Mục tiêu bấm được / nghiệm thu được
- Trang Chương trình học: tạo lớp **bắt buộc chọn cơ sở**, danh sách lớp hiển thị rõ khoá học + cơ sở.
- **Không xoá được lớp còn học viên đang học**: API trả 409 kèm thông báo, UI hiển thị lỗi thay vì im lặng.
- Có **sơ đồ lộ trình cấp độ** Starter → Mover → Flyer: mỗi cấp hiển thị số khoá học, số lớp và tên các khoá học của cấp đó.
- Dữ liệu lấy thật từ `GET /levels`, `GET /courses`, `GET /classes` (branch-scoped).

## Task
| # | Task | Tầng | Ghi chú |
| --- | --- | --- | --- |
| 1 | `catalog/service.ts`: `deleteClass()` trả `DeleteClassOutcome` — chặn khi lớp còn ghi danh đang hoạt động (`listEnrollmentsByClass` đã lọc `ended_at is null`), trả `has_enrollments`; lớp không tồn tại → `not_found` | API | Không thêm method store mới — tái dùng `listEnrollmentsByClass` |
| 2 | `catalog/routes.ts`: `DELETE /classes/:id` map outcome → 409 `Lop con hoc vien dang hoc, khong the xoa` / 404 / 204 | API | Giữ `requireAdmin` + branch-scope |
| 3 | `CatalogPage.tsx`: hiển thị lỗi khi xoá lớp thất bại (`onError` → `formError`); thêm cột "Khoá học" trong bảng lớp | FE | Đang xoá im lặng khi API lỗi |
| 4 | `apps/web/src/features/catalog/LevelRoadmap.tsx`: sơ đồ lộ trình cấp độ (thứ tự starter → mover → flyer, không theo alphabet của API), mỗi cấp là một bước có mũi tên nối, hiện số khoá học/số lớp + tên khoá học | FE | Component mới, chỉ đọc |
| 5 | Test API: `service.test.ts` (chặn xoá lớp có ghi danh, xoá được lớp rỗng, lớp không tồn tại) + `routes.test.ts` (DELETE → 409 / 204) | Test | Stub store hiện có đã đủ method |
| 6 | Test FE: `LevelRoadmap.test.tsx` (đúng thứ tự cấp + số liệu) và `CatalogPage.test.tsx` (xoá lớp bị chặn → hiện thông báo lỗi) | Test | — |

## Stub cho phép
- Sơ đồ lộ trình là sơ đồ điều hướng bằng HTML/CSS (không dùng thư viện vẽ ngoài), chưa cần kéo–thả hay chỉnh sửa lộ trình.
- Chưa cần đổi cấp độ của khoá học bằng kéo thả; dùng form sửa sẵn có của API nếu cần.

## Không được stub
Xác thực, phân quyền, hạn mức, chuỗi hiển thị — trừ khi ghi khác trong ADR.
Ngoài ra: chặn xoá lớp phải là chặn thật ở server (không chỉ ẩn nút), và số liệu lộ trình phải đếm từ dữ liệu thật.

## Nợ kỹ thuật
| Marker | Vị trí | Nội dung | Dự kiến trả |
| --- | --- | --- | --- |
| TODO(slice-28) | `catalog/service.ts` | Đếm ghi danh bằng một query riêng trước khi xoá (2 round-trip); có thể gộp thành `delete ... where not exists` | Khi đo thấy chậm |
| TODO(slice-28) | `LevelRoadmap.tsx` | Số lớp đếm theo lớp thuộc phạm vi cơ sở người xem (branch-scoped), không phải toàn hệ thống | Khi cần báo cáo toàn trung tâm |

## Nhật ký thay đổi phạm vi của riêng Slice/Task này
| Ngày | Loại | Nội dung | Lý do | ADR |
| --- | --- | --- | --- | --- |
| 2026-11-26 | Tạo | Khởi tạo file slice từ yêu cầu mục 11 | Lập kế hoạch thực thi | — |

## Cách nghiệm thu
- Thủ công: tạo lớp mới phải chọn cơ sở; lớp hiện trong bảng kèm khoá học và cơ sở.
- Thủ công: ghi danh 1 học viên vào lớp → bấm Xoá lớp → thấy thông báo "Lớp còn học viên đang học, không thể xoá", lớp vẫn còn; gỡ hết học viên → xoá được.
- Thủ công: sơ đồ lộ trình hiển thị Starter → Mover → Flyer đúng thứ tự, số khoá học/lớp khớp danh sách bên dưới.
- Test tự động: `catalog/service.test.ts`, `catalog/routes.test.ts`, `LevelRoadmap.test.tsx`, `CatalogPage.test.tsx`.

## Bàn giao phiên gần nhất

- 2026-11-26: Hoàn tất.
- API: `catalog/service.ts` `deleteClass()` trả `DeleteClassOutcome` — chặn bằng `listEnrollmentsByClass` (đã lọc `ended_at is null`) → `has_enrollments`; `routes.ts` map 409 `Lop con hoc vien dang hoc, khong the xoa`, 404 khi lớp không tồn tại, 204 khi xoá được.
- FE: `CatalogPage.tsx` hiện lỗi khi xoá bị chặn (dùng `throwApiError` để lấy message server), thêm cột "Khoá học"; `LevelRoadmap.tsx` mới — sơ đồ Starter → Mover → Flyer (tự sắp theo `LevelCode`, không theo alphabet của API), hiện số khoá học/lớp + tên khoá học.
- Test: API `service.test.ts` (+2 case), `routes.test.ts` (+1 case 409/204); FE `LevelRoadmap.test.tsx` (3 case), `CatalogPage.test.tsx` (+1 case chặn xoá). Tất cả PASS; typecheck + eslint `--max-warnings=0` PASS ở cả `apps/api` và `apps/web`.
- Lưu ý: "tạo lớp chọn cơ sở" đã có sẵn từ slice-1 (select cơ sở bắt buộc + API kiểm tra branch-scope) — slice này chỉ bổ sung cột hiển thị khoá học, không đổi contract tạo lớp.
