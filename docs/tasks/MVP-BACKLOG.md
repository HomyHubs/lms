# MVP Backlog

Bß║úng chß╗ë mß╗Ñc cß║Ñp cao cho to├án bß╗Ö Slice / Task / layer-pass. ─É├óy l├á bß║úng T├ôM Tß║«T ΓÇö chi tiß║┐t tß╗½ng d├▓ng nß║▒m ß╗ƒ file ri├¬ng trong `docs/tasks/slices/`. Kh├┤ng viß║┐t m├┤ tß║ú d├ái trong bß║úng n├áy ─æß╗â tr├ính xung ─æß╗Öt khi nhiß╗üu dev c├╣ng sß╗¡a.

## Quy tß║»c

- ID bß║Ñt biß║┐n: chß╗ë th├¬m d├▓ng mß╗¢i, kh├┤ng x├│a, kh├┤ng ─æ├ính sß╗æ lß║íi (xem `../../AGENTS.md`, mß╗Ñc "Quy tr├¼nh thay ─æß╗òi phß║ím vi").
- Mß╗ùi d├▓ng c├│ ─æ├║ng 1 Owner khi chuyß╗ân sang "─Éang l├ám" ΓÇö kh├┤ng nhß║¡n viß╗çc ─æ├ú c├│ Owner.
- Cß╗Öt "Phß╗Ñ thuß╗Öc" liß╗çt k├¬ ID phß║úi Done tr╞░ß╗¢c khi bß║»t ─æß║ºu ΓÇö d├╣ng ─æß╗â biß║┐t viß╗çc n├áo chß║íy song song ─æ╞░ß╗úc.
- Cß║¡p nhß║¡t cß╗Öt Trß║íng th├íi ngay khi ─æß╗òi, kh├┤ng chß╗¥ cuß╗æi ng├áy.
- Khi Slice/Task merge xong v├áo `dev`: chuyß╗ân Trß║íng th├íi = Done, x├│a Owner, ─æiß╗ün sß╗æ PR, rß╗ôi cß║¡p nhß║¡t rollup ß╗ƒ `../../AGENTS.md`.

## Bß║úng chß╗ë mß╗Ñc

| ID | T├¬n | C╞í chß║┐ | Trß║íng th├íi | Owner | Nh├ính | PR | Phß╗Ñ thuß╗Öc | File chi tiß║┐t |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| slice-0 | Nền tảng & Auth (walking skeleton + đăng nhập SĐT + quên mật khẩu qua Email) | Dọc | Done | — | feature/slice-0-nen-tang-auth | 1 | — | `slices/slice-0-nen-tang-auth.md` |
| slice-1 | Quản lý người dùng, cơ sở (Branch) & phân quyền + role superadmin & giới hạn export học viên | Dọc | Done | — | feature/slice-1-user-branch-phan-quyen | 3 | slice-0 | `slices/slice-1-user-branch-phan-quyen.md` |
| slice-2 | OTP qua Email cho đổi/khôi phục mật khẩu (bỏ WhatsApp/Telegram) | Dọc | Done | — | feature/slice-2-otp-da-kenh | — | slice-1 | `slices/slice-2-otp-da-kenh.md` |
| slice-3 | Ngân hàng câu hỏi theo cấp độ (Starter/Mover/Flyer) + import | Dọc | Done | — | dev | 5 | slice-1 | `slices/slice-3-ngan-hang-cau-hoi.md` |
| slice-3.1 | Hoàn thiện UI ngân hàng câu hỏi + import CSV/XLSX nghiêm ngặt (nghiệm thu E2E/axe) | Dọc | Done | — | dev | 7 | slice-3 | `slices/slice-3.1-question-completion.md` |
| slice-4 | Tạo đề & Thi online | Dọc | Done | — | dev | 6 | slice-3 | `slices/slice-4-tao-de-thi-online.md` |
| slice-4.5 | Sinh prompt AI & import ngược câu hỏi | Dọc | Done | — | dev | 12 | slice-3 | `slices/slice-4.5-sinh-prompt-ai-import.md` |
| slice-5 | Chấm điểm tự động & Thi lại | Dọc | Done | — | dev | 9 | slice-4 | `slices/slice-5-cham-diem-thi-lai.md` |
| slice-6 | Điểm danh | Dọc | Done | — | dev | 10 | slice-1 | `slices/slice-6-diem-danh.md` |
| slice-7 | Xếp loại học viên & Dashboard Admin (gồm ngưỡng Đậu/Rớt cấu hình theo cấp độ) | Dọc | Done | — | dev | 13 (+be1ea9c) | slice-5, slice-6 | `slices/slice-7-xep-loai-dashboard.md` |
| slice-8 | Ngày công & giờ dạy giáo viên/nhân viên | Dọc | Done | — | dev | 14 | slice-1, slice-6 | `slices/slice-8-ngay-cong-gio-day.md` |
| slice-9 | Mở rộng: chấm bán tự động Speaking/Writing + thông báo tự động (ô dù, tách thành 9a/9b) | Dọc | Hoãn | — | — | — | slice-5 | `slices/slice-9-mo-rong.md` |
| slice-9a | Chấm tay Speaking/Writing + import bảng điểm Excel | Dọc | Done | — | dev | 16 | slice-5 | `slices/slice-9a-cham-tay.md` |
| slice-9b | Thông báo tự động (in-app + outbox) | Dọc | Done | — | dev | 18 | slice-5 | `slices/slice-9b-thong-bao.md` |
| slice-10 | Giao diện chung (AppShell, điều hướng theo role) | Dọc | Done | — | dev | 15 | slice-1 | `slices/slice-10-giao-dien-chung.md` |
| slice-11a | Bộ đề cố định | Dọc | Done | — | dev | 19 | slice-4 | `slices/slice-11a-bo-de-co-dinh.md` |
| slice-11b | Import đề Word/Excel | Dọc | Done | — | dev | 21 | slice-11a | `slices/slice-11b-import-de-word-excel.md` |
| slice-11c | Import trắc nghiệm từ Excel | Dọc | Done | — | dev | 28 | slice-11a | `slices/slice-11c-mc-excel.md` |
| slice-12 | Hình ảnh câu hỏi (bank + docx + chấm) | Dọc | Done | — | dev | 22 | slice-3 | `slices/slice-12-hinh-anh-cau-hoi.md` |
| slice-13 | Lịch sử thi & Báo cáo thi | Dọc | Done | — | dev | 20 | slice-5 | `slices/slice-13-lich-su-thi-bao-cao.md` |
| slice-14 | Bài thi theo lớp | Dọc | Done | — | dev | — | slice-4 | `slices/slice-14-bai-thi-theo-lop.md` |
| slice-15 | Đồng bộ hiển thị họ tên học viên (thay SĐT làm định danh trên các màn) | Dọc | Done | — | dev | — | slice-5, slice-6, slice-13 | `slices/slice-15-dong-bo-ten-hoc-vien.md` |
| seed-demo | Dữ liệu demo thực tế hơn: mỗi cơ sở nhiều lớp (4–6) trộn Starter/Mover/Flyer, sĩ số khác nhau (commit `1012ef9`) | — | Done | — | dev | — | slice-6, slice-14 | `apps/api/src/scripts/seed-demo.ts` |
| postman-setup | Bộ tài nguyên Postman: collection "LMS API" (~95 request, 16 feature folder), environment "LMS Local", OpenAPI spec `lms-api.yaml`; cập nhật `.gitignore` để theo dõi `postman/` nhưng vẫn bỏ qua `postman/globals/` (commit `aa80a74`) | — | Done | — | dev | — | — | `postman/` (collections, environments, specs) |
| slice-16 | Dashboard Tổng quan: số trên đầu bar, đổi tên "Tổng số học viên theo khóa học/cơ sở", màu bar theo level/cơ sở, sửa nhãn chart bị che, drill-down cơ sở (mục 1) | Dọc | Done | — | feature/slice-16-dashboard-tong-quan | — | slice-7 | `slices/slice-16-dashboard-tong-quan.md` |
| slice-17 | Điểm danh: calendar chọn ngày, nhóm theo cơ sở, chart điểm danh hôm nay, GUI đẹp (mục 2) | Dọc | Done (còn nợ) | — | feature/slice-17-diem-danh-view | — | slice-6 | `slices/slice-17-diem-danh-view.md` |
| slice-18 | Ngân hàng câu hỏi: mẫu Excel, tab theo cấp độ, nút sửa/xóa 1 dòng, filter theo cột, panel đóng/mở + nhớ trạng thái (mục 3.1-3.4, 3.6, 3.7) | Dọc | Done | — | dev | — | slice-3 | `slices/slice-18-ngan-hang-cau-hoi-ui.md` |
| slice-19 | Phân quyền sửa câu hỏi theo role (settings bật/tắt trong quản lý user) (mục 3.5; ADR 0015) | Dọc | Done | — | dev | d332cd2 | slice-1, slice-3 | `slices/slice-19-quyen-sua-cau-hoi.md` |
| slice-20 | Bộ đề & Đề thi: bố cục lại panel Tạo đề, filter danh sách đề, xem trước đề, mẫu Excel import (mục 4.1, 4.2, 4.3, 4.5) | Dọc | Done | — | dev | 4d54c1e | slice-4, slice-11a | `slices/slice-20-bo-de-de-thi-ui.md` |
| slice-21 | Liên kết Đề thi ↔ Bộ đề: panel đưa câu hỏi vào/ra bộ đề + xem trước (mục 4.4; giữ mô hình bộ đề = tập câu hỏi) | Dọc | Done | — | dev | 794bc74 | slice-20 | `slices/slice-21-lien-ket-de-bo-de.md` |
| slice-22 | Chấm bài: link tải mẫu file, nút bắt đầu chấm, sửa kết quả, đưa điểm vào lớp + preview trước khi import (mục 5.2, 5.3) | Dọc | Chưa bắt đầu | — | — | — | slice-5, slice-9a | `slices/slice-22-cham-bai.md` |
| slice-23 | Mã học viên / mã user chuẩn hóa, tách khỏi SĐT (mục 5.1, 9.1-mã; ADR 0014, migration) | Dọc | Chưa bắt đầu | — | — | — | slice-1 | `slices/slice-23-ma-hoc-vien.md` |
| slice-24 | Báo cáo thi & xếp loại: phân trang 50/trang, chọn 20/50, dashboard pass/fail theo cơ sở/trung tâm/cấp độ (chart, %, số) (mục 6, 8) | Dọc | Done | — | dev | — | slice-13, slice-7 | `slices/slice-24-bao-cao-thi-xep-loai.md` |
| slice-25 | Ngày công & giờ dạy: chi tiết theo giáo viên (filter tháng), theo lớp + chart (mục 7) | Dọc | Chưa bắt đầu | — | — | — | slice-8 | `slices/slice-25-ngay-cong-gio-day-chi-tiet.md` |
| slice-26 | Người dùng: SĐT nhỏ dưới họ tên, làm lại cột tuổi học viên (mục 9.1-hiển thị, 9.2) | Dọc | Done | — | dev | 32 | slice-1 | `slices/slice-26-nguoi-dung-hien-thi.md` |
| slice-27 | Trung tâm cơ sở: cho sửa thông tin cơ sở (mục 10) | Dọc | Chưa bắt đầu | — | — | — | slice-1 | `slices/slice-27-trung-tam-co-so-edit.md` |
| slice-28 | Chương trình học: tạo lớp chọn cơ sở, chặn xóa lớp có học viên, sơ đồ lộ trình cấp độ (mục 11) | Dọc | Chưa bắt đầu | — | — | — | slice-1 | `slices/slice-28-chuong-trinh-hoc.md` |
| slice-29 | Ghi danh & Quản lý (đổi tên từ Gán cơ sở): 2 panel — HV/GV gán theo lớp, quản lý gán theo cơ sở (mục 12) | Dọc | Chưa bắt đầu | — | — | — | slice-1 | `slices/slice-29-ghi-danh-quan-ly.md` |
| slice-30 | Menu Học viên (mới): tìm & hồ sơ chi tiết học viên — điểm, giờ học, chuyên cần, thi, học lực (số + chart theo panel) (mục 13) | Dọc | Chưa bắt đầu | — | — | — | slice-13, slice-5, slice-6 | `slices/slice-30-menu-hoc-vien.md` |
| slice-1.1 | Bảo toàn lịch sử ghi danh (thay đổi slice-1) | Dọc | Đang làm | Notion AI | feature/slice-1.1-lich-su-ghi-danh | — | slice-1, slice-6.1 | `slices/slice-1.1-lich-su-ghi-danh.md` |
| slice-6.1 | Điểm danh nhiều lớp và hiện diện (thay đổi slice-6) | Dọc | Đang làm | Notion AI | feature/slice-6.1-diem-danh-hien-dien | — | slice-6, slice-8 | `slices/slice-6.1-diem-danh-hien-dien.md` |
| slice-10.1 | Menu quản lý thi | Dọc | Đang làm | Notion AI | feature/exam-management-menu | — | slice-10, slice-11a, slice-13 | `slices/slice-10.1-menu-quan-ly-thi.md` |

## Trß║íng th├íi hß╗úp lß╗ç

Ch╞░a bß║»t ─æß║ºu, ─Éang l├ám, Review, Done, Done (c├▓n nß╗ú), Ho├ún, ─É├ú hß╗ºy, ─É├ú thay thß║┐. ─Éß╗ïnh ngh─⌐a ─æß║ºy ─æß╗º: xem `../../AGENTS.md`, mß╗Ñc "Quy tr├¼nh thay ─æß╗òi phß║ím vi".

## C├ích th├¬m mß╗Öt Slice/Task mß╗¢i

1. Tß║ío file tß╗½ `slices/_TEMPLATE.md`, ─æß║╖t t├¬n `slices/<id>-<slug>.md`.
2. Th├¬m ─æ├║ng mß╗Öt d├▓ng v├áo bß║úng tr├¬n, trß║íng th├íi "Ch╞░a bß║»t ─æß║ºu".
3. Nß║┐u ─æ├óy l├á thay ─æß╗òi phß║ím vi cß╗ºa mß╗Öt Slice/Task ─æ├ú c├│, ─æß╗ìc `../../AGENTS.md` mß╗Ñc "Quy tr├¼nh thay ─æß╗òi phß║ím vi" tr╞░ß╗¢c.
