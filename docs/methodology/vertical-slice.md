# Lát cắt dọc (Vertical Slice) — Profile phương pháp triển khai

## 1. Định nghĩa

Một slice là một lát cắt đi xuyên suốt: UI → API → Service → Database → UI. Xong một slice là có một thứ bấm được thau, không phải một lớp kỹ thuật rời rạc.

| Cách chia (tránh) | Cách chia (áp dụng) |
| --- | --- |
| Slice 1: toàn bộ database | Slice 1: đăng nhập (UI + API + DB) |
| Slice 2: toàn bộ API | Slice 2: tạo đơn hàng (UI + API + DB) |
| Slice 3: toàn bộ UI | Slice 3: xem lịch sử đơn hàng (UI + API + DB) |

## 2. Quy tắc bắt buộc

- Mỗi slice tối đa 2-4 task.
- Xong một slice phải kết thúc bằng một màn hình bấm được, không phải code nằm im chưa nối.
- Stub được phép, nhưng phải đánh dấu `TODO(slice-N)` kèm mô tả.
- Cấm stub: xác thực, phân quyền, hạn mức thương mại, chuỗi hiển thị đa ngôn ngữ — trừ khi ghi khác trong ADR.
- Một slice tương ứng một PR.

## 3. Definition of Done cho một slice

- [ ] Đi xuyên được từ UI tới DB và ngược lại, không còn đoạn nối giả
- [ ] Người ngoài bấm được mà không cần giải thích thêm
- [ ] Mọi stub đã đánh dấu `TODO(slice-N)` và ghi vào nợ kỹ thuật của slice
- [ ] Không stub các mục bị cấm ở mục 2
- [ ] Đạt Definition of Done chung ở `../../AGENTS.md`
- [ ] File chi tiết `docs/tasks/slices/<id>.md` và `docs/tasks/MVP-BACKLOG.md` đã cập nhật
- [ ] `AGENTS.md` của từng feature liên quan đã cập nhật
- [ ] Đã rebase với `dev` và kiểm tra không xắp chồng với slice khác đã merge

## 4. Khung lộ trình slice (mẫu, điền theo dự án)

| Slice | Nội dung | Bắt buộc |
| --- | --- | --- |
| 0 | Walking skeleton — nối thông frontend/backend/database | Có |
| 1 | Xác thực | Có |
| 2 | Entity chính đầu tiên | Có |
| 3 | Entity phụ thuộc entity chính | Có |
| 4 | Luồng giao dịch chính | Có |
| 5 | Phân quyền | Có |
| 6 | Báo cáo | Tùy dự án |
| 7+ | Trả nợ kỹ thuật | Tùy dự án |

## 5. Mẫu mô tả một slice

Dùng file `docs/tasks/slices/_TEMPLATE.md`. Cột "Tầng" trong bảng Task để trống khi dùng lát cắt dọc.

## 6. Song song hoá nhiều dev

Mỗi dev nhận một slice độc lập, làm trên nhánh và worktree riêng. Slice phụ thuộc slice khác (cột "Phụ thuộc" trong `MVP-BACKLOG.md`) phải chờ slice nguồn đạt trạng thái "Done" (đã pass review và merge vào `dev`) trước khi bắt đầu — trạng thái "Đang làm" KHÔNG đủ điều kiện. Chỉ bắt đầu sớm hơn khi chính người dùng chủ động yêu cầu và chấp nhận rủi ro tích hợp, ghi rõ trong `MVP-BACKLOG.md`. Chi tiết: `../../AGENTS.md`, mục "Làm việc song song nhiều dev / nhiều feature".

## 7. Chỉ dẫn cho AI Coding Agent

1. Đầu phiên: đọc `../../AGENTS.md` → file này → `../tasks/MVP-BACKLOG.md` → file slice đang làm.
2. Chỉ nhận slice đang ở trạng thái "Chưa bắt đầu" hoặc chính slice đang "Đang làm" của mình.
3. Nếu slice có cột "Phụ thuộc": chỉ bắt đầu khi phụ thuộc đó đã "Done" (đã pass review và merge vào `dev`). Nếu chưa, dừng và đợi, không bắt đầu code trước.
4. Mỗi phiên chỉ tập trung một slice.
5. Không tự ý đánh số lại slice; muốn đổi phại đề xuất trước theo mục 8.
6. Cập nhật tài liệu trước, code sau.
7. Cập nhật `docs/tasks/MVP-BACKLOG.md`, file slice và `AGENTS.md` của feature trong cùng PR với code.
8. Nếu slice phình quá 4 task, tách thành slice-Na / slice-Nb theo mục 8.
9. Ngay khi mở PR: nhắc bắt đầu quy trình review liền (đừng để PR chờ) — các slice khác phụ thuộc vào slice này đang bị chặn cho tới khi PR pass review và merge.

## 8. Thêm / sửa / xóa tính năng giữa chừng

Xem quy tắc đầy đủ (đánh số, ba loại thay đổi, checklist ảnh hưởng, trạng thái, thứ tự thao tác) tại `../../AGENTS.md`, mục "Quy trình thay đổi phạm vi". Quy tắc đó áp dụng nguyên vẹn cho slice dọc, với lưu ý riêng: khi xóa một tính năng đã code, không xóa cứng bảng dữ liệu nghiệp vụ — đánh dấu deprecated và giữ migration đảo ngược được.
