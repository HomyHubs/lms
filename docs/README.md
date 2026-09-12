# Docs — thứ tự đọc

1. `../AGENTS.md` — quy tắc vận hành và bản đồ tài liệu.
2. `methodology/README.md` — chọn cơ chế triển khai (Lát cắt dọc / Lát cắt ngang).
3. `methodology/vertical-slice.md` hoặc `methodology/horizontal-slice.md` — tùy cơ chế đã chọn.
4. `methodology/webapp-template.md` — nếu dự án là web app có frontend và backend.
5. `tasks/MVP-BACKLOG.md` — bảng chỉ mục Slice/Task.
6. `tasks/slices/<id>.md` — chi tiết Slice/Task đang làm.
7. `tasks/CURRENT.md` — chỉ đọc khi làm tuần tự một mình.
8. `ai-workflow/README.md` — vòng đời task, làm việc song song, tích hợp, auto-merge, bàn giao phiên.
9. `decision-backlog.md` — các gate chưa mở, kiểm tra trước một mốc lớn.
10. `adr/` — các quyết định cross-cutting đã chốt.

File `AGENTS.md` của từng thư mục feature (mẫu ở `templates/feature-AGENTS.template.md`) không nằm trong `docs/`, mà đặt ngay trong thư mục feature tương ứng để dev làm feature nào sửa file của feature đó.
