# Slice/Task slice-4.5 — Sinh prompt AI & import nguoc cau hoi

- Co che: Doc
- Owner hien tai: ...
- Nhanh: ...
- PR: ...
- Trang thai: xem `../MVP-BACKLOG.md`
- Phu thuoc: slice-3
- Sua muc goc: de trong (day la tinh nang moi duoc chen giua slice-4 va slice-5 theo yeu cau bo sung, dung so thap phan theo AGENTS.md muc 22.1)

## Muc tieu bam duoc / nghiem thu duoc

Admin/Giao vien chon cap do + ky nang + so luong + de mau tham khao, he thong sinh ra 1 prompt hoan chinh dung theo Question Import Schema (slice-3) de copy ra dung o cong cu AI ben ngoai (ChatGPT/Claude/Gemini...). He thong KHONG goi truc tiep AI provider. Sau khi co ket qua tu AI ngoai, nguoi dung dan/upload lai, he thong validate dung schema, dua vao hang cho duyet, roi moi luu vao Ngan hang cau hoi.

## Task

| # | Task | Tang | Ghi chu |
| --- | --- | --- | --- |
| 1 | Giao dien chon Level/Skill/so luong + de mau tham khao (tu ngan hang) -> sinh prompt hoan chinh theo dung Question Import Schema, cho phep copy | - | Luu lai prompt + de mau da chon vao `AiGenerationRequest` |
| 2 | Chuc nang dan/upload ket qua tu AI ngoai (JSON/CSV theo schema), validate dung field/enum, danh dau nguon `source: ai_generated` | - | Tai su dung co che validate/import cua slice-3 |
| 3 | Hang cho duyet (review queue): Admin/Giao vien xem lai, chinh sua, roi luu chinh thuc vao Ngan hang cau hoi | - | Trang thai: draft -> imported -> reviewed -> saved_to_bank |

## Stub cho phep

Chua can tu dong hoa viec goi AI provider (dung ngoai chu dinh, khong phai gioi han ky thuat).

## Khong duoc stub

Validate schema truoc khi cho vao hang cho duyet phai la thuc; khong duoc luu thang vao ngan hang ma bo qua buoc duyet (tru khi nguoi dung xac nhan khac di trong ADR).

## No ky thuat

| Marker | Vi tri | Noi dung | Du kien tra |
| --- | --- | --- | --- |

## Nhat ky thay doi pham vi cua rieng Slice/Task nay

| Ngay | Loai | Noi dung | Ly do | ADR |
| --- | --- | --- | --- | --- |
| 2026-09-12 | Them tinh nang moi | Tao slice-4.5 (chen giua slice-4 va slice-5) cho luong sinh prompt AI + import nguoc | Yeu cau bo sung tu trang Notion LMS: sinh de bang AI la lay prompt ra ngoai roi import vao, prompt phai dinh nghia dinh dang du lieu thong nhat | - |

## Cach nghiem thu

Sinh 1 prompt, dan ket qua JSON mau dung schema vao he thong, thay cau hoi xuat hien trong hang cho duyet, duyet xong thay cau hoi co trong Ngan hang cau hoi voi nguon `ai_generated`.

## Ban giao phien gan nhat

Dien theo mau `../../ai-workflow/templates/session-handoff.md` khi dung giua chung.
