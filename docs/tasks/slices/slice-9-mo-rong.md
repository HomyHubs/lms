# Slice/Task slice-9 — ĐÃ HỦY: Mở rộng chấm Speaking/Writing + thông báo tự động

- Cơ chế: Dọc
- Owner hiện tại: —
- Nhánh: —
- PR: —
- Trạng thái: **Đã hủy (quyết định không làm)** — xem `../MVP-BACKLOG.md`
- Phụ thuộc: slice-5
- Sửa mục gốc: —

## Kết luận

Slice này là một **ô dù** gộp hai việc rời nhau. Cả hai đều đã có kết cục rõ ràng nên slice được **hủy, không còn phần nào phải code**:

| Mảnh nội dung | Kết cục | Nơi xử lý |
| --- | --- | --- |
| Chấm Speaking/Writing qua UI | **Đã làm** (chấm tay + import bảng điểm Excel) | `slice-9a` (Done, PR 16, ADR 0009) |
| Thông báo tự động (nhắc thi lại, nhắc lịch dạy) | **Đã làm** (in-app + outbox, kênh cấu hình được) | `slice-9b` (Done, PR 18, ADR 0010) |
| Chấm **bán tự động** (biến thể "bản tự động") | **Bỏ hẳn** — không làm | Quyết định chủ sở hữu 2026-11-10, xác nhận lại 2026-11-26 |
| Audio (Listening) + ghi âm (Speaking) | **Không làm trong LMS** — giáo viên tự chấm và đưa kết quả vào lớp, đúng luồng đã hoàn tất | Quyết định chủ sở hữu 2026-11-26 |

## Cách xử lý phần audio / ghi âm (chốt 2026-11-26)

Không xây kho audio hay chức năng ghi âm trong LMS. Dùng lại đúng luồng đã có và đã nghiệm thu:

1. Giáo viên cho học viên làm phần Listening/Speaking ngoài hệ thống (phát audio tại lớp, học viên nói/ghi âm theo cách trung tâm đang dùng).
2. Giáo viên **tự chấm** và nhập điểm bằng luồng chấm tay của `slice-9a` (nhập điểm/nhận xét cho câu tự luận, hoặc import bảng điểm Excel).
3. Giáo viên **đưa kết quả vào lớp** bằng luồng của `slice-22` (chấm bài → xem trước → đưa điểm vào lớp).

Hệ quả kỹ thuật: `features/media` giữ nguyên chỉ phục vụ **ảnh** (ADR 0013); câu hỏi `listening`/`speaking` không có trường audio; không có endpoint upload/phát audio, không có recorder ở web. Đây là **quyết định có chủ ý, không phải nợ kỹ thuật**.

## Task

| # | Task | Tầng | Kết cục |
| --- | --- | --- | --- |
| 1 | Giao diện giáo viên chấm điểm Speaking/Writing | FE | **Bỏ.** Chấm tay qua UI + import Excel đã do `slice-9a` đảm nhiệm; không làm thêm biến thể "bán tự động"/AI nào |
| 2 | Thông báo tự động qua WhatsApp/Telegram | API | **Xong ở `slice-9b`.** Tái dùng tích hợp slice-2, kênh `NOTIFY_CHANNEL` (whatsapp/telegram/console) |

## Stub cho phép

Không áp dụng — slice đã hủy, không còn task nào để stub.

## Không được stub

Không áp dụng.

## Nợ kỹ thuật

| Marker | Vị trí | Nội dung | Dự kiến trả |
| --- | --- | --- | --- |
| — | — | Slice đóng, không phát sinh nợ mới. Nợ còn lại của phần thông báo nằm ở ADR 0010 (chưa opt-out theo user, chưa báo "đã có điểm", Telegram gửi 1 chat ops chung, đa process có thể gửi trùng 1 bản ghi pending) | Khi product cần |

## Nhật ký thay đổi phạm vi của riêng Slice/Task này

| Ngày | Loại | Nội dung | Lý do | ADR |
| --- | --- | --- | --- | --- |
| 2026-11-02 | Hoãn | Không làm slice-9 cho MVP (trạng thái → Hoãn). Nội dung còn mơ hồ, làm rõ lại nếu sau này cần | Quyết định chủ sở hữu | — |
| 2026-11-10 | Huỷ | Task 1 (chấm Speaking/Writing qua UI, biến thể "bán tự động") → KHÔNG LÀM. Chấm tay qua UI + import Excel đã do `slice-9a` (Done) đảm nhiệm; không làm thêm biến thể bán tự động/AI nào | Quyết định chủ sở hữu | — |
| 2026-11-11 | Tách | Task 2 tách thành `slice-9b` và được làm ngay (owner mở lại phần thông báo) | Chủ sở hữu yêu cầu | 0010 |
| 2026-11-26 | Hủy | **Hủy slice-9 (trạng thái → `Đã hủy`, theo AGENTS.md mục "Quy trình thay đổi phạm vi": bỏ tính năng chưa code thì đổi trạng thái + ghi lý do, giữ nguyên dòng).** Xác nhận bỏ hẳn chấm bán tự động; phần audio/ghi âm không xây trong LMS mà dùng luồng "giáo viên tự chấm + đưa kết quả vào lớp" đã có (`slice-9a` + `slice-22`). Gỡ `TODO(slice-9)` khỏi migration `20260921000000_questions.sql` vì đây là quyết định có chủ ý, không phải nợ | Quyết định chủ sở hữu | 0003, 0013 |

## Cách nghiệm thu

Không còn nghiệm thu riêng cho slice này. Nghiệm thu nằm ở hai slice đã xong:

- `slice-9a`: giáo viên chấm được bài Speaking/Writing bằng tay và/hoặc import bảng điểm Excel, điểm hiển thị đúng cho học viên.
- `slice-9b`: học viên trượt đề thấy nhắc thi lại, giáo viên thấy nhắc buổi dạy trong 24 giờ tới; thông báo vào chuông in-app và gửi qua kênh đã cấu hình.

## Nếu sau này muốn mở lại

Phải mở **slice mới** (không tái sử dụng ID slice-9, theo quy tắc ID bất biến) và trả lời trước 3 câu: (1) audio do ai cung cấp và lưu ở đâu; (2) chấm bằng gì — người hay máy; (3) nếu máy thì ngưỡng tin cậy và ai duyệt lại. Khi đó mới cần ADR mới + migration mới.

## Bàn giao phiên gần nhất

**2026-11-26 — hủy slice-9 (chỉ sửa tài liệu + comment, không sửa code nghiệp vụ)**

Đã làm:
- Hủy slice-9 trong `../MVP-BACKLOG.md` (trạng thái `Hoãn` → `Đã hủy`), ghi lý do trong doc này.
- Gỡ marker `TODO(slice-9)` ở `db/migrations/20260921000000_questions.sql` và các slice doc liên quan (`slice-3`, `slice-5`, `slice-6`, `slice-12`), thay bằng ghi chú "quyết định có chủ ý, không phải nợ".
- Cập nhật `AGENTS.md`, `../CURRENT.md`, `../HANDOFF-BY-CATEGORY.md`, ADR 0003/0013, `design/ui-reference.md` để không ai đọc nhầm là còn việc phải làm.

Không đổi: code API/web, schema DB (chỉ sửa comment trong migration đã áp dụng).
