# Slice/Task slice-9b — Thong bao trong app + nhac nho tu dong

- Co che: Doc
- Owner hien tai: An Vo
- Nhanh: feature/slice-9b-thong-bao
- PR: xem `../MVP-BACKLOG.md`
- Trang thai: xem `../MVP-BACKLOG.md`
- Phu thuoc: slice-2, slice-5, slice-7, slice-10
- Sua muc goc: slice-9 (task 2)

## Muc tieu bam duoc / nghiem thu duoc

Hoc vien truot de va da het thoi gian cho thay chuong bao "Ban co the thi lai"; giao vien thay nhac buoi day trong 24 gio toi. Moi thong bao gui qua kenh cau hinh (WhatsApp/Telegram/console). Admin bam "Gui nhac nho ngay" de chay quet tuc thi.

## Task

| # | Task | Tang | Ghi chu |
| --- | --- | --- | --- |
| 1 | Bang `notifications` (outbox + hop thu, `dedupe_key` unique) | DB | `20261111000000_notifications.sql`, ADR 0010 |
| 2 | Quet nhac thi lai + nhac buoi day, enqueue khong trung, gui + thu lai toi da 3 lan | API | `features/notifications/` |
| 3 | Kenh gui dung lai WhatsApp/Telegram cua slice-2, mac dinh console | API | `NOTIFY_CHANNEL` |
| 4 | Lich chay trong process moi `NOTIFY_INTERVAL_MINUTES` (15) + `POST /notifications/run` (Admin) | API | |
| 5 | `GET /notifications`, danh dau da doc 1/tat ca | API | Chi user dang nhap |
| 6 | Chuong thong bao tren header AppShell | Web | `features/notifications/` |

## Stub cho phep

Kenh console khi moi truong chua co thong tin WhatsApp/Telegram (thong bao van vao chuong).

## Khong duoc stub

Bang outbox that tren Postgres, chong trung bang unique key, RBAC that.

## No ky thuat

| Marker | Vi tri | Noi dung | Du kien tra |
| --- | --- | --- | --- |
| — | ADR 0010 | Telegram gui ve 1 chat ops (user chua co chat id); nhieu process API co the gui trung 1 ban ghi pending; chua co tat thong bao theo user, chua bao "da co diem" | Khi product can |

## Nhat ky thay doi pham vi cua rieng Slice/Task nay

| Ngay | Loai | Noi dung | Ly do | ADR |
| --- | --- | --- | --- | --- |
| 2026-11-11 | Them | Tach tu slice-9 task 2, owner yeu cau lam | slice-9 bi hoan, owner mo lai | 0010 |

## Cach nghiem thu

Tao bai truot co luot thi lai da het cooldown, hoac buoi hoc trong 24 gio toi -> Admin bam "Gui nhac nho ngay" -> hoc vien/giao vien thay chuong co so chua doc; bam thong bao -> da doc. Chay lai khong tao trung.

Da kiem: api `service.test.ts` (enqueue + gui + khong trung; loi gui -> thu lai -> bo sau 3 lan; doi so E.164), `routes.test.ts` (chi thay cua minh + danh dau da doc, run chi Admin), `store.integration.test.ts` tren Postgres that (ung vien thi lai/buoi day, chong trung, gui, doc); web `App.test.tsx` (chuong, danh dau da doc, nut Admin). Migration up -> down -> up tren DB test. Mutation (bo gioi han 3 lan thu gui -> 1 test do).
