# Chọn cơ chế triển khai

Dự án này hỗ trợ hai cơ chế triển khai: Lát cắt dọc (Vertical Slice) và Lát cắt ngang (Horizontal Slice). Không được tự ý chọn thay người dùng.

## Quy tắc bắt buộc cho AI Coding Agent

1. Nếu user đã nêu rõ cơ chế (ví dụ: "làm theo vertical slice", "mỗi lần ra một tính năng bấm được", "làm xong hết database rồi mới đến API", "lát cắt ngang") thi dùng đúng cơ chế đó, không hỏi lại.
2. Nếu user KHÔNG nêu rõ, phải dừng lại và hỏi trước khi lên kế hoạch chia task hoặc viết code. Không tự mặc định chọn một trong hai.
3. Câu hỏi mẫu, kèm giải thích ngắn:

```
Dự án nên triển khai theo cơ chế nào?

1) Lát cắt dọc (Vertical Slice)
   Mỗi 2-4 task ra một màn hình bấm được, đi xuyên UI - API - Service - DB - UI.
   Phù hợp khi cần demo sớm, đội full-stack làm theo từng tính năng, nghiệp vụ chưa chốt hết.

2) Lát cắt ngang (Horizontal Slice)
   Làm xong toàn bộ một tầng (Database, rồi API, rồi Frontend) cho mọi entity trong milestone, rồi mới chuyển sang tầng tiếp theo.
   Phù hợp khi schema/API đã chốt sẵn, đội chia theo chuyên môn tầng, hoặc cần hoàn thiện toàn bộ API trước khi tích hợp hệ thống khác.
```

4. Sau khi chọn, ghi cơ chế vào bảng Bối cảnh dự án trong `AGENTS.md` và dùng đúng file quy tắc tương ứng: `vertical-slice.md` hoặc `horizontal-slice.md`.
5. Có thể trộn theo milestone (một số dùng dọc, một số dùng ngang) nếu ghi rõ trong `docs/tasks/MVP-BACKLOG.md` kèm lý do và một ADR, vì đây là quyết định cross-cutting.

## Bảng so sánh nhanh

| Tiêu chí | Lát cắt dọc | Lát cắt ngang |
| --- | --- | --- |
| Cách chia việc | Mỗi lần một tính năng nhỏ, đủ mọi tầng | Xong hết một tầng cho mọi entity rồi mới sang tầng sau |
| Khi nào thấy sản phẩm chạy được | Sau mỗi 2-4 task | Sau khi tầng frontend của milestone hoàn tất |
| Rủi ro tích hợp | Thấp, trả nợ liên tục | Cao hơn, dồn vào cuối mỗi tầng |
| Phù hợp khi | Đội full-stack theo feature, cần demo sớm, nghiệp vụ chưa chốt hết | Schema/API đã chốt sẵn, đội chia theo chuyên môn tầng, tích hợp hệ thống ngoài |
| Song song hoá | Theo feature (mỗi dev một slice dọc) | Theo entity trong cùng một tầng |
| ID công việc | `slice-<n>` | `layer-<tầng>-<entity>` |
| File quy tắc | `vertical-slice.md` | `horizontal-slice.md` |
