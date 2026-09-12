# Lát cắt ngang (Horizontal Slice) — Profile phương pháp triển khai

## 1. Định nghĩa

Triển khai theo từng tầng kỹ thuật (layer) xuyên suốt toàn bộ (hoặc một nhóm) entity trong một milestone, hoàn thành xong một tầng cho toàn bộ phạm vi rồi mới chuyển sang tầng kế tiếp.

```
Tầng 1: Toàn bộ database/migration cho các entity trong milestone
   ↓
Tầng 2: Toàn bộ API/service cho các entity đó
   ↓
Tầng 3: Toàn bộ frontend gọi API đó
```

## 2. Khi nào dùng lát cắt ngang

- Schema/API cho cả milestone đã chốt sẵn và ít đổi.
- Đội chia theo chuyên môn tầng (đội database, đội backend, đội frontend) thay vì full-stack theo feature.
- Tích hợp với hệ thống cũ/bên ngoài có hợp đồng API cố định, cần hoàn thiện toàn bộ API trước khi tích hợp có ý nghĩa.
- Yêu cầu tuân thủ/quy định đòi hỏi rà soát toàn bộ mô hình dữ liệu trước khi xây UI.

Rủi ro chính: tích hợp muộn, không có demo sớm. Cách giảm rủi ro nằm ở mục 3.

## 3. Quy tắc bắt buộc

1. Danh sách entity trong milestone phải cố định trước khi bắt đầu tầng 1, ghi trong `docs/tasks/MVP-BACKLOG.md`.
2. Một tầng chỉ được coi là "Xong" khi TẤT CẢ entity trong milestone đã hoàn thành tầng đó và pass cổng gác.
3. Bắt buộc có demo/smoke-test cuối mỗi tầng, không chờ hết cả 3 tầng:
   - Cuối tầng database: migrate lên/xuống thành công, seed dữ liệu mẫu.
   - Cuối tầng API: gọi được toàn bộ endpoint qua contract test, chưa cần UI.
   - Cuối tầng frontend: demo bấm được end-to-end như lát cắt dọc.
4. Cho phép stub ở tầng API khi tầng database của một entity phụ thuộc gián tiếp chưa xong, nhưng phải đánh dấu `TODO(layer-api:<entity>)` và ghi vào nợ kỹ thuật.
5. Không bỏ qua tầng nào hoặc "nhảy" thẳng lên frontend trước khi API tầng dưới hoàn chỉnh cho chính entity đó. Nếu cần linh hoạt như vậy cho một entity riêng, đổi entity đó sang lát cắt dọc và ghi ADR.
6. Một entity trong một tầng là một PR. Không gộp nhiều entity không liên quan vào một PR.
7. Đổi kiến trúc giữa chừng vẫn phải ghi ADR như lát cắt dọc.

## 4. Song song hoá nhiều dev

Khác lát cắt dọc (song song theo feature), lát cắt ngang song song theo entity trong cùng một tầng:

- Đội database: mỗi dev một entity/migration riêng, chạy song song nếu các bảng không ràng buộc khóa ngoại chéo nhau; nếu có khóa ngoại chéo, dev tạo bảng cha phải merge trước.
- Đội API: chỉ bắt đầu một entity sau khi migration entity đó đã merge vào `dev`.
- Đội frontend: chỉ bắt đầu một entity sau khi API entity đó đã merge vào `dev`.
- Ghi rõ cột "Phụ thuộc" trong `docs/tasks/MVP-BACKLOG.md` để agent biết việc nào chạy song song được, việc nào phải chờ.

## 5. Definition of Done cho một layer-pass (entity x tầng)

- [ ] Đúng 1 entity, đúng 1 tầng trong phạm vi PR
- [ ] Cổng gác của repo xanh
- [ ] Nếu là tầng database: migration đảo ngược được, đã test rollback, đã seed mẫu
- [ ] Nếu là tầng API: khớp contract/OpenAPI đã cập nhật, có test tích hợp qua database thật, xác thực/phân quyền enforce thật (không stub)
- [ ] Nếu là tầng frontend: gọi đúng API thật (không mock), có test cho luồng chính
- [ ] Mọi stub có `TODO(layer-<tầng>:<entity>)` và đã ghi vào nợ kỹ thuật
- [ ] `docs/tasks/MVP-BACKLOG.md` và file chi tiết đã cập nhật trong cùng PR

## 6. Khung lộ trình theo tầng (mẫu, điền theo dự án)

| Milestone | Entity trong phạm vi | Tầng database | Tầng API | Tầng frontend |
| --- | --- | --- | --- | --- |
| M1 | orders, customers | Chưa bắt đầu | Chưa bắt đầu | Chưa bắt đầu |

## 7. Mẫu mô tả một layer-pass

Dùng file `docs/tasks/slices/_TEMPLATE.md`, đặt ID dạng `layer-<tầng>-<entity>` (ví dụ `layer-db-orders`), điền cột "Tầng" trong bảng Task.

## 8. Thêm / sửa / xóa entity giữa chừng

Áp dụng nguyên vẹn quy tắc ở `../../AGENTS.md`, mục "Quy trình thay đổi phạm vi", với ID dạng `layer-<tầng>-<entity>` thay vì `slice-<n>`. Không đánh số lại, chỉ thêm dòng mới.

## 9. Chỉ dẫn cho AI Coding Agent

1. Đầu phiên: đọc `../../AGENTS.md` → file này → `../tasks/MVP-BACKLOG.md` → file layer-pass đang làm.
2. Chỉ làm đúng 1 entity x 1 tầng mỗi lần.
3. Không tự chuyển tầng cho một entity khi tầng dưới của chính entity đó chưa Done.
4. Khi xong: cập nhật `docs/tasks/MVP-BACKLOG.md`, file layer-pass chi tiết, và `AGENTS.md` của feature/entity đó.
