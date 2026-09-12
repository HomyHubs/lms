# Quy trình AI Workflow

Mô tả cơ chế để nhiều dev/agent làm việc song song trên nhiều Slice/Task mà không đụng file nhau, và cách tích hợp (merge) an toàn có ngữ cảnh.

## Thứ tự đọc khi bắt đầu phiên

1. `../../AGENTS.md` ở gốc repo.
2. `../methodology/README.md` — xác nhận cơ chế triển khai (Dọc/Ngang) đang dùng.
3. `../tasks/MVP-BACKLOG.md` — chọn hoặc xác nhận Slice/Task đang phụ trách, kiểm tra cột Phụ thuộc.
4. `../tasks/slices/<id>.md` — chi tiết Slice/Task đang làm.
5. `AGENTS.md` của thư mục feature đang sửa — nhật ký gần nhất, xem người trước dừng ở đâu.
6. `../tasks/CURRENT.md` — CHỈ đọc nếu chắc chắn đang làm một mình tuần tự.

## Vòng đời một Slice/Task

1. Thêm dòng vào `MVP-BACKLOG.md` với ID bất biến, trạng thái "Chưa bắt đầu".
2. Tạo file chi tiết từ `../tasks/slices/_TEMPLATE.md`.
3. Khi nhận việc: đổi trạng thái "Đang làm", ghi Owner, tạo nhánh riêng từ `dev`.
4. Trong lúc làm: cập nhật `AGENTS.md` của feature liên tục (tối thiểu mỗi ngày làm việc) theo mẫu `../templates/feature-AGENTS.template.md`, và cập nhật file chi tiết slice khi có thay đổi phạm vi.
5. Trước khi mở PR: chạy cổng gác, rebase/merge `dev` mới nhất, đọc lại `MVP-BACKLOG.md` để biết Slice/Task nào khác đã merge có thể ảnh hưởng tới file dùng chung.
6. Mở PR, base = `dev`, đổi trạng thái Slice/Task = "Review" trong `MVP-BACKLOG.md`.
7. Review pass (điều kiện ở mục "Auto-merge" bên dưới) → tự động merge → tự động xóa nhánh.
8. Sau merge: đổi trạng thái = "Done" (kèm số PR) trong `MVP-BACKLOG.md`, cập nhật rollup ở `../../AGENTS.md`.

## Làm việc song song nhiều dev trên nhiều feature

- Mỗi Slice/Task có đúng 1 Owner tại một thời điểm (cột Owner trong `MVP-BACKLOG.md`) — không nhận việc đã có Owner.
- Mỗi Owner làm trong một worktree + một nhánh riêng (xem `../../AGENTS.md`, mục "Làm việc song song nhiều dev / nhiều feature").
- Không bắt đầu Slice/Task có cột "Phụ thuộc" chưa ở trạng thái Done (đã pass review và merge vào `dev`). Trạng thái "Đang làm" của phụ thuộc không đủ điều kiện để bắt đầu. Ngoại lệ chỉ khi chính người dùng chủ động yêu cầu làm song song tuần tự và ghi rõ lý do + rủi ro vào `MVP-BACKLOG.md`.
- File dùng chung (điểm ghép router/app.ts, openapi.yaml, package.json...) sửa theo kiểu "mỗi dòng độc lập" hoặc append-only để giảm conflict; nếu bắt buộc sửa cùng vùng, phải làm tuần tự và ghi chú trong `MVP-BACKLOG.md`.

## Quy trình tích hợp (merge) có ngữ cảnh

Trước khi merge một Slice/Task vào `dev`, người/agent thực hiện merge phải:

1. Kéo `dev` mới nhất về nhánh của Slice/Task, giải quyết conflict.
2. Đọc `MVP-BACKLOG.md` để liệt kê Slice/Task khác đã merge vào `dev` từ lúc nhánh này được tạo.
3. Với mỗi Slice/Task đó, đọc nhanh `AGENTS.md` của feature liên quan (mục "Đã xong" gần nhất) để biết có đổi contract, schema, hoặc điểm ghép dùng chung hay không.
4. Nếu có đổi ảnh hưởng: cập nhật code đang merge cho khớp, không ghi đè thay đổi của Slice/Task kia.
5. Chạy lại toàn bộ cổng gác sau khi rebase.
6. Mô tả PR ghi rõ: Slice/Task ID, cơ chế (Dọc/Ngang), các Slice/Task khác có giao nhau về file, đã rebase với `dev` tại commit nào.
7. Reviewer xác nhận: không drift OpenAPI, migration additive, `AGENTS.md` của feature đã cập nhật, `MVP-BACKLOG.md` đã cập nhật.

## Auto-merge sau khi review pass và xóa nhánh

Điều kiện auto-merge (PR vào `dev`):

- Tối thiểu 1 review "Approved" (hoặc gate tự động tương đương nếu dự án dùng agent review).
- Toàn bộ status check bắt buộc xanh (cổng gác ở `../../AGENTS.md`, mục "Cổng gác tất định").
- Không còn "Changes requested" nào chưa resolve.

Khi đủ điều kiện: PR tự động merge (squash) vào `dev` và nhánh nguồn tự động bị xóa. Cấu hình mẫu: `../../.github/workflows/auto-merge.yml`. Bật thêm trong Settings của repo GitHub: "Allow auto-merge", "Automatically delete head branches", và branch protection yêu cầu status check trên `dev`.

Nếu review "Changes requested": KHÔNG auto-merge; dev sửa tiếp trên cùng nhánh, review lại.

## Quy tắc bàn giao giữa phiên (hết token, hết quota, mất điện, máy treo)

- Bất cứ khi nào sắp dừng, trạng thái phải luôn được ghi vào 2 nơi: `AGENTS.md` của feature (nhật ký liên tục) và file chi tiết Slice/Task (mục "Bàn giao phiên gần nhất").
- Dùng mẫu `templates/session-handoff.md` cho cả hai nơi trên để đồng nhất định dạng.
- Nếu bị ngắt đột ngột (mất điện, máy treo, hết quota giữa chừng) và phiên trước KHÔNG kịp ghi bàn giao: phiên sau phải tự suy luận trạng thái từ `git log` trên nhánh, `git diff dev...HEAD`, cổng gác hiện tại (pass/fail), rồi mới cập nhật lại bàn giao cho đúng trước khi tiếp tục.
- Không bao giờ giả định "chắc là đã xong" khi không có ghi chú rõ ràng — luôn chạy lại cổng gác trước khi tiếp tục hoặc mở PR.
- Chỉ dùng `../tasks/CURRENT.md` làm nơi bàn giao khi chắc chắn đang làm tuần tự một mình.

## Chiến lược nhánh

Xem `../../AGENTS.md`, mục "Mô hình nhánh, release và hotfix". Tóm tắt: mọi Slice/Task làm trên nhánh riêng, PR base = `dev`; `main` chỉ nhận code lúc release hoặc hotfix; agent không tự merge vào `main`.
