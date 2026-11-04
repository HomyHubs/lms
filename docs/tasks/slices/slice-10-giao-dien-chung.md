# Slice/Task slice-10 — Giao dien chung (AppShell, dashboard theo vai tro, restyle)

- Co che: Doc
- Owner hien tai: An Vo
- Nhanh: feature/ui-shell
- PR: xem `../MVP-BACKLOG.md`
- Trang thai: xem `../MVP-BACKLOG.md`
- Phu thuoc: slice-8
- Sua muc goc: de trong

## Muc tieu bam duoc / nghiem thu duoc

Moi trang sau dang nhap nam trong mot khung chung (sidebar theo vai tro + thanh tren), trang chu la dashboard theo vai tro, cac trang cu dung chung mot bo mau/component theo `docs/design/ui-reference.md` — khong doi hanh vi nghiep vu.

## Task

| # | Task | Tang | Ghi chu |
| --- | --- | --- | --- |
| 1 | `AppShell`: sidebar loc theo vai tro (pill active, thu gon tren mobile), thanh tren (chip DB, so dien thoai + vai tro, dang xuat) | Web | `components/layout/AppShell.tsx`; an khi in (`print:hidden`) |
| 2 | Nguon duy nhat cho dieu huong: `NAV_ITEMS` dung cho sidebar, loi tat dashboard va guard vai tro cua route | Web | `components/layout/nav.ts`; `App.tsx` map route tu `NAV_ITEMS` |
| 3 | Token mau theo vai tro + pattern class + component chung | Web | `tailwind.config.js` (primary/success/accent/warning/danger); `.c-card/.c-section-title/.c-hero/.c-input/.c-table`; `Card/CardTitle/StatCard/Badge/PageHeader`, `buttonVariants`, `TONE_TILE` |
| 4 | Dashboard `/` theo vai tro (Admin/GV/Nhan vien/Hoc vien) dung API da co | Web | Thay trang health-check; health thanh chip tren thanh tren |
| 5 | Restyle cac trang cu trong khung (bo `<main>`/link "Trang chu" rieng) | Web | Khong doi hanh vi; test cu giu xanh |

## Stub cho phep

O tim kiem va chuong thong bao chua lam (chuong thuoc slice-9b).

## Khong duoc stub

Guard vai tro cua route va danh sach menu phai lay tu cung `NAV_ITEMS`; so lieu dashboard lay tu API that.

## No ky thuat

| Marker | Vi tri | Noi dung | Du kien tra |
| --- | --- | --- | --- |

## Nhat ky thay doi pham vi cua rieng Slice/Task nay

| Ngay | Loai | Noi dung | Ly do | ADR |
| --- | --- | --- | --- | --- |
| 2026-11-09 | Them | Slice moi theo de xuat trong `docs/design/ui-reference.md`, owner dong y | Giao dien thong nhat truoc khi them tinh nang | 0008 |

## Cach nghiem thu

Dang nhap lan luot 4 vai tro: menu chi hien muc dung vai tro, trang chu hien dashboard dung vai tro, vao URL khong duoc phep thi bi chuyen ve; cac trang cu van hoat dong nhu truoc.

Da kiem: web `App.test.tsx` (menu + dashboard theo 4 vai tro; hoc vien vao `/users` bi chuyen ve), toan bo test web cu xanh (48/48), typecheck + lint; mutation (`navItemsFor` tra menu admin cho moi vai tro -> 3 test do). Giao dien thuc te: owner xem tren demo.

## Ban giao phien gan nhat

Dien theo mau `../../ai-workflow/templates/session-handoff.md` khi dung giua chung.
