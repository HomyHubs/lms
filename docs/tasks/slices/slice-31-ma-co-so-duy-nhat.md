# Slice/Task slice-31 — Mã cơ sở là duy nhất

- Cơ chế: Dọc
- Owner hiện tại: —
- Nhánh: `dev`
- PR: —
- Trạng thái: xem `../MVP-BACKLOG.md` (nguồn trạng thái duy nhất, không ghi trùng ở đây để tránh lệch)
- Phụ thuộc: slice-23, slice-23-c
- Sửa mục gốc: slice-23 (mã học viên lấy tiền tố từ `branches.code`)

## Mục tiêu bấm được / nghiệm thu được

Hai cơ sở không thể mang cùng một mã (kể cả chỉ khác hoa/thường hoặc khoảng trắng thừa). Nhờ vậy tính chất của ADR 0022 — đọc mã học viên là biết cơ sở — không bị phá bởi một lần nhập liệu sai.

Không có màn hình mới. Nghiệm thu bằng migration + integration test trên Postgres thật.

## Task

| # | Task | Tầng (nếu dùng Lát cắt ngang) | Ghi chú |
| --- | --- | --- | --- |
| 1 | Migration `20261128000001_branches_code_unique.sql`: kiểm tra trùng trên `upper(btrim(code))` và báo lỗi có danh sách; sau đó tạo partial unique index | DB | Đảo ngược bằng `drop index`; không sửa migration cũ |
| 2 | `apps/api/src/features/centers/store.integration.test.ts`: chèn trùng mã phải bị từ chối; hai mã khác nhau (kể cả `'hv'` vs `'HV'` → trùng) kiểm đúng | API (test) | Chỉ chạy khi có `TEST_DATABASE_URL` |
| 3 | Ghi ADR 0023 + cập nhật nhật ký feature `centers` | Docs | — |

## Stub cho phép

Không có. Phạm vi nhỏ, không stub.

## Không được stub

Ràng buộc dữ liệu (index) và migration — đây chính là thứ slice này tồn tại để làm.

## Nợ kỹ thuật

| Marker | Vị trí | Nội dung | Dự kiến trả |
| --- | --- | --- | --- |
| — | — | `branches.code` chưa có trong contract `Branch` và chưa cho sửa qua API/UI; muốn sửa mã cơ sở phải dùng SQL. Đây là tính năng riêng (xem ADR 0023 §Decision 4), không phải nợ của slice này | Khi chủ dự án yêu cầu sửa mã cơ sở |

## Nhật ký thay đổi phạm vi của riêng Slice/Task này

| Ngày | Loại | Nội dung | Lý do | ADR |
| --- | --- | --- | --- | --- |
| 2026-11-28 | Thêm | Tạo slice: unique index trên `branches.code` | ADR 0022 làm mã học viên phụ thuộc `branches.code`; trùng mã làm mã mất khả năng phân biệt cơ sở, và lỗi này im lặng | 0023 |

## Cách nghiệm thu

- Tự động: `pnpm --filter @lms/api test` (có `TEST_DATABASE_URL`) — file `centers/store.integration.test.ts` chứng minh insert trùng bị từ chối.
- Migration: `dev-health-check` chạy `dbmate up → down → up` trên Postgres thật, nên tính đảo ngược được kiểm tự động.
- Thủ công trên DB có dữ liệu trùng: `dbmate up` phải dừng và in ra danh sách mã trùng.

## Bàn giao phiên gần nhất

Không có — slice hoàn tất trong một phiên.
