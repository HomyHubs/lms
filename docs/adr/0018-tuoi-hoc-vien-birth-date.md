# ADR 0018 — Tuổi học viên: `birth_date` chính xác, `birth_year` chỉ là dự phòng (trả nợ slice-26)

Status: Accepted

## Context

Slice-26 (mục 9.1 hiển thị + 9.2) yêu cầu cột "Tuổi" chỉ áp dụng cho học viên và "được tính đúng theo quy ước đã chốt". Khi làm slice đó, bảng `users` chỉ có `birth_year int` (migration `20261115000001_users_profile_fields.sql`), nên công thức buộc phải là:

```ts
age = new Date().getFullYear() - birth_year
```

Công thức này trả về **tuổi sẽ đạt trong năm nay**, không phải tuổi hiện tại. Ví dụ hôm nay 2026-11-27, học viên sinh 2015-12-30: công thức cho `11`, tuổi thật là `10`. Sai lệch tối đa ±1 và **luôn sai theo hướng lớn hơn** trong khoảng từ đầu năm đến trước sinh nhật.

Sai lệch này không vô hại: cấp độ Starter/Mover/Flyer của trung tâm được phân theo độ tuổi, nên một học viên bị hiển thị dư 1 tuổi có thể bị xếp nhầm cấp.

Slice-26 đã ghi nợ `TODO(slice-26)` với dự kiến trả là "khi có nhu cầu + migration `birth_date`". Đây là lúc trả nợ đó.

## Decision

1. Thêm cột `users.birth_date date` (nullable). Migration CHỈ THÊM và đảo ngược được (AGENTS.md mục 16). **Không** backfill từ `birth_year` — không thể suy ra ngày/tháng, và việc đặt mặc định `01-01` sẽ tạo ra dữ liệu sai một cách tự tin hơn là dữ liệu thiếu.
2. Giữ nguyên `birth_year` (không xoá, không đổi kiểu). Hai cột là hai mức độ chính xác của **cùng một** dữ liệu, không phải hai trường độc lập:
   - Có `birth_date` → nguồn sự thật là ngày sinh; `birth_year` được **dẫn xuất** từ nó (`year(birth_date)`) mỗi khi ghi.
   - Chỉ có `birth_year` (dữ liệu cũ / nhập nhanh) → vẫn hợp lệ, tuổi là ước lượng.
3. Tuổi tính theo **giờ Việt Nam** (`Asia/Ho_Chi_Minh`), không theo giờ máy chủ: `toAdminUser` so ngày hôm nay (dạng `YYYY-MM-DD`) với ngày sinh để biết đã qua sinh nhật chưa. Dùng chung quy ước timezone đã có ở attendance/examhistory.
4. Contract: `AdminUser` thêm `birthDate: string | null` (`YYYY-MM-DD`), giữ `birthYear`. `CreateUserRequest`/`UpdateUserRequest` nhận `birthDate` (ưu tiên) và vẫn nhận `birthYear` (tương thích ngược, seed, nhập nhanh). Nếu gửi cả hai và không khớp năm → lỗi validate, không im lặng chọn một.
5. `age` vẫn CHỈ tính cho role `student`; role khác `null`. Không thêm trường "độ chính xác" vào contract — FE tự suy ra từ `birthDate == null`, và hiển thị tuổi ước lượng kèm dấu `~` + tooltip.

## Consequences

- Tuổi của học viên có ngày sinh là **chính xác**; tuổi của học viên chỉ có năm sinh vẫn lệch ±1 nhưng giờ **được hiển thị là ước lượng**, không còn giả vờ chính xác.
- Form người dùng đổi ô "Năm sinh" thành ô "Ngày sinh" (`type=date`). Nhập chỉ năm không còn qua UI, nhưng vẫn qua API (giữ tương thích cho seed/import cũ).
- Cần migration + `db.ts` + contract + service + store + FE + test. Không đổi dữ liệu đã lưu của user hiện có.
- Bảng `users` giờ có hai cột mô tả cùng một thứ. Ràng buộc "khớp năm" được thực thi ở tầng validate + service, **không** bằng CHECK constraint của Postgres (tránh phải sửa dữ liệu cũ khi một trong hai cột null).
- Nếu sau này muốn bỏ hẳn `birth_year`, cần một slice riêng: backfill `birth_date` cho dữ liệu cũ là bất khả thi, nên chỉ có thể bỏ sau khi xác nhận không còn bản ghi year-only.
