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
| slice-0 | Nß╗ün tß║úng & Auth (walking skeleton + ─æ─âng nhß║¡p S─ÉT + qu├¬n mß║¡t khß║⌐u qua Email) | Dß╗ìc | Done | ΓÇö | feature/slice-0-nen-tang-auth | 1 | ΓÇö | `slices/slice-0-nen-tang-auth.md` |
| slice-1 | Quß║ún l├╜ ng╞░ß╗¥i d├╣ng, c╞í sß╗ƒ (Branch) & ph├ón quyß╗ün + role superadmin & giß╗¢i hß║ín export hß╗ìc vi├¬n | Dß╗ìc | Done | ΓÇö | feature/slice-1-user-branch-phan-quyen | 3 | slice-0 | `slices/slice-1-user-branch-phan-quyen.md` |
| slice-2 | OTP qua Email cho ─æß╗òi/kh├┤i phß╗Ñc mß║¡t khß║⌐u (bß╗Å WhatsApp/Telegram) | Dß╗ìc | Done | ΓÇö | feature/slice-2-otp-da-kenh | ΓÇö | slice-1 | `slices/slice-2-otp-da-kenh.md` |
| slice-3 | Ng├ón h├áng c├óu hß╗Åi theo cß║Ñp ─æß╗Ö (Starter/Mover/Flyer) + import | Dß╗ìc | Done | ΓÇö | dev | 5 | slice-1 | `slices/slice-3-ngan-hang-cau-hoi.md` |
| slice-3.1 | Ho├án thiß╗çn UI ng├ón h├áng c├óu hß╗Åi + import CSV/XLSX nghi├¬m ngß║╖t (nghiß╗çm thu E2E/axe) | Dß╗ìc | Done | ΓÇö | dev | 7 | slice-3 | `slices/slice-3.1-question-completion.md` |
| slice-4 | Tß║ío ─æß╗ü & Thi online | Dß╗ìc | Done | ΓÇö | dev | 6 | slice-3 | `slices/slice-4-tao-de-thi-online.md` |
| slice-4.5 | Sinh prompt AI & import ng╞░ß╗úc c├óu hß╗Åi | Dß╗ìc | Done | ΓÇö | dev | 12 | slice-3 | `slices/slice-4.5-sinh-prompt-ai-import.md` |
| slice-5 | Chß║Ñm ─æiß╗âm tß╗▒ ─æß╗Öng & Thi lß║íi | Dß╗ìc | Done | ΓÇö | dev | 9 | slice-4 | `slices/slice-5-cham-diem-thi-lai.md` |
| slice-6 | ─Éiß╗âm danh | Dß╗ìc | Done | ΓÇö | dev | 10 | slice-1 | `slices/slice-6-diem-danh.md` |
| slice-7 | Xß║┐p loß║íi hß╗ìc vi├¬n & Dashboard Admin (gß╗ôm ng╞░ß╗íng ─Éß║¡u/Rß╗¢t cß║Ñu h├¼nh theo cß║Ñp ─æß╗Ö) | Dß╗ìc | Done | ΓÇö | dev | 13 (+be1ea9c) | slice-5, slice-6 | `slices/slice-7-xep-loai-dashboard.md` |
| slice-8 | Ng├áy c├┤ng & giß╗¥ dß║íy gi├ío vi├¬n/nh├ón vi├¬n | Dß╗ìc | Done | ΓÇö | dev | 14 | slice-1, slice-6 | `slices/slice-8-ngay-cong-gio-day.md` |
| slice-9 | Mß╗ƒ rß╗Öng: chß║Ñm b├ín tß╗▒ ─æß╗Öng Speaking/Writing + th├┤ng b├ío tß╗▒ ─æß╗Öng (├┤ d├╣, t├ích th├ánh 9a/9b) | Dß╗ìc | Ho├ún | ΓÇö | ΓÇö | ΓÇö | slice-5 | `slices/slice-9-mo-rong.md` |
| slice-9a | Chß║Ñm tay Speaking/Writing + import bß║úng ─æiß╗âm Excel | Dß╗ìc | Done | ΓÇö | dev | 16 | slice-5 | `slices/slice-9a-cham-tay.md` |
| slice-9b | Th├┤ng b├ío tß╗▒ ─æß╗Öng (in-app + outbox) | Dß╗ìc | Done | ΓÇö | dev | 18 | slice-5 | `slices/slice-9b-thong-bao.md` |
| slice-10 | Giao diß╗çn chung (AppShell, ─æiß╗üu h╞░ß╗¢ng theo role) | Dß╗ìc | Done | ΓÇö | dev | 15 | slice-1 | `slices/slice-10-giao-dien-chung.md` |
| slice-11a | Bß╗Ö ─æß╗ü cß╗æ ─æß╗ïnh | Dß╗ìc | Done | ΓÇö | dev | 19 | slice-4 | `slices/slice-11a-bo-de-co-dinh.md` |
| slice-11b | Import ─æß╗ü Word/Excel | Dß╗ìc | Done | ΓÇö | dev | 21 | slice-11a | `slices/slice-11b-import-de-word-excel.md` |
| slice-11c | Import trß║»c nghiß╗çm tß╗½ Excel | Dß╗ìc | Done | ΓÇö | dev | 28 | slice-11a | `slices/slice-11c-mc-excel.md` |
| slice-12 | H├¼nh ß║únh c├óu hß╗Åi (bank + docx + chß║Ñm) | Dß╗ìc | Done | ΓÇö | dev | 22 | slice-3 | `slices/slice-12-hinh-anh-cau-hoi.md` |
| slice-13 | Lß╗ïch sß╗¡ thi & B├ío c├ío thi | Dß╗ìc | Done | ΓÇö | dev | 20 | slice-5 | `slices/slice-13-lich-su-thi-bao-cao.md` |
| slice-14 | B├ái thi theo lß╗¢p | Dß╗ìc | Done | ΓÇö | dev | ΓÇö | slice-4 | `slices/slice-14-bai-thi-theo-lop.md` |
| slice-15 | ─Éß╗ông bß╗Ö hiß╗ân thß╗ï hß╗ì t├¬n hß╗ìc vi├¬n (thay S─ÉT l├ám ─æß╗ïnh danh tr├¬n c├íc m├án) | Dß╗ìc | Done | ΓÇö | dev | ΓÇö | slice-5, slice-6, slice-13 | `slices/slice-15-dong-bo-ten-hoc-vien.md` |
| seed-demo | Dß╗» liß╗çu demo thß╗▒c tß║┐ h╞ín: mß╗ùi c╞í sß╗ƒ nhiß╗üu lß╗¢p (4ΓÇô6) trß╗Ön Starter/Mover/Flyer, s─⌐ sß╗æ kh├íc nhau (commit `1012ef9`) | ΓÇö | Done | ΓÇö | dev | ΓÇö | slice-6, slice-14 | `apps/api/src/scripts/seed-demo.ts` |
| postman-setup | Bß╗Ö t├ái nguy├¬n Postman: collection "LMS API" (~95 request, 16 feature folder), environment "LMS Local", OpenAPI spec `lms-api.yaml`; cß║¡p nhß║¡t `.gitignore` ─æß╗â theo d├╡i `postman/` nh╞░ng vß║½n bß╗Å qua `postman/globals/` (commit `aa80a74`) | ΓÇö | Done | ΓÇö | dev | ΓÇö | ΓÇö | `postman/` (collections, environments, specs) |
| slice-16 | Dashboard Tß╗òng quan: sß╗æ tr├¬n ─æß║ºu bar, ─æß╗òi t├¬n "Tß╗òng sß╗æ hß╗ìc vi├¬n theo kh├│a hß╗ìc/c╞í sß╗ƒ", m├áu bar theo level/c╞í sß╗ƒ, sß╗¡a nh├ún chart bß╗ï che, drill-down c╞í sß╗ƒ (mß╗Ñc 1) | Dß╗ìc | Done | ΓÇö | feature/slice-16-dashboard-tong-quan | ΓÇö | slice-7 | `slices/slice-16-dashboard-tong-quan.md` |
| slice-17 | ─Éiß╗âm danh: calendar chß╗ìn ng├áy, nh├│m theo c╞í sß╗ƒ, chart ─æiß╗âm danh h├┤m nay, GUI ─æß║╣p (mß╗Ñc 2) | Dß╗ìc | Ch╞░a bß║»t ─æß║ºu | ΓÇö | ΓÇö | ΓÇö | slice-6 | `slices/slice-17-diem-danh-view.md` |
| slice-18 | Ng├ón h├áng c├óu hß╗Åi: mß║½u Excel, tab theo cß║Ñp ─æß╗Ö, n├║t sß╗¡a/x├│a 1 d├▓ng, filter theo cß╗Öt, panel ─æ├│ng/mß╗ƒ + nhß╗¢ trß║íng th├íi (mß╗Ñc 3.1-3.4, 3.6, 3.7) | Dß╗ìc | Done | ΓÇö | dev | ΓÇö | slice-3 | `slices/slice-18-ngan-hang-cau-hoi-ui.md` |
| slice-19 | Ph├ón quyß╗ün sß╗¡a c├óu hß╗Åi theo role (settings bß║¡t/tß║»t trong quß║ún l├╜ user) (mß╗Ñc 3.5; ADR 0015) | Dß╗ìc | Done | ΓÇö | dev | d332cd2 | slice-1, slice-3 | `slices/slice-19-quyen-sua-cau-hoi.md` |
| slice-20 | Bß╗Ö ─æß╗ü & ─Éß╗ü thi: bß╗æ cß╗Ñc lß║íi panel Tß║ío ─æß╗ü, filter danh s├ích ─æß╗ü, xem tr╞░ß╗¢c ─æß╗ü, mß║½u Excel import (mß╗Ñc 4.1, 4.2, 4.3, 4.5) | Dß╗ìc | Done | ΓÇö | dev | 4d54c1e | slice-4, slice-11a | `slices/slice-20-bo-de-de-thi-ui.md` |
| slice-21 | Li├¬n kß║┐t ─Éß╗ü thi Γåö Bß╗Ö ─æß╗ü: panel ─æ╞░a c├óu hß╗Åi v├áo/ra bß╗Ö ─æß╗ü + xem tr╞░ß╗¢c (mß╗Ñc 4.4; giß╗» m├┤ h├¼nh bß╗Ö ─æß╗ü = tß║¡p c├óu hß╗Åi) | Dß╗ìc | Done | ΓÇö | dev | 794bc74 | slice-20 | `slices/slice-21-lien-ket-de-bo-de.md` |
| slice-22 | Chß║Ñm b├ái: link tß║úi mß║½u file, n├║t bß║»t ─æß║ºu chß║Ñm, sß╗¡a kß║┐t quß║ú, ─æ╞░a ─æiß╗âm v├áo lß╗¢p + preview tr╞░ß╗¢c khi import (mß╗Ñc 5.2, 5.3) | Dß╗ìc | Ch╞░a bß║»t ─æß║ºu | ΓÇö | ΓÇö | ΓÇö | slice-5, slice-9a | `slices/slice-22-cham-bai.md` |
| slice-23 | M├ú hß╗ìc vi├¬n / m├ú user chuß║⌐n h├│a, t├ích khß╗Åi S─ÉT (mß╗Ñc 5.1, 9.1-m├ú; ADR 0014, migration) | Dß╗ìc | Ch╞░a bß║»t ─æß║ºu | ΓÇö | ΓÇö | ΓÇö | slice-1 | `slices/slice-23-ma-hoc-vien.md` |
| slice-24 | B├ío c├ío thi & xß║┐p loß║íi: ph├ón trang 50/trang, chß╗ìn 20/50, dashboard pass/fail theo c╞í sß╗ƒ/trung t├óm/cß║Ñp ─æß╗Ö (chart, %, sß╗æ) (mß╗Ñc 6, 8) | Dß╗ìc | Ch╞░a bß║»t ─æß║ºu | ΓÇö | ΓÇö | ΓÇö | slice-13, slice-7 | `slices/slice-24-bao-cao-thi-xep-loai.md` |
| slice-25 | Ng├áy c├┤ng & giß╗¥ dß║íy: chi tiß║┐t theo gi├ío vi├¬n (filter th├íng), theo lß╗¢p + chart (mß╗Ñc 7) | Dß╗ìc | Ch╞░a bß║»t ─æß║ºu | ΓÇö | ΓÇö | ΓÇö | slice-8 | `slices/slice-25-ngay-cong-gio-day-chi-tiet.md` |
| slice-26 | Ng╞░ß╗¥i d├╣ng: S─ÉT nhß╗Å d╞░ß╗¢i hß╗ì t├¬n, l├ám lß║íi cß╗Öt tuß╗òi hß╗ìc vi├¬n (mß╗Ñc 9.1-hiß╗ân thß╗ï, 9.2) | Dß╗ìc | Ch╞░a bß║»t ─æß║ºu | ΓÇö | ΓÇö | ΓÇö | slice-1 | `slices/slice-26-nguoi-dung-hien-thi.md` |
| slice-27 | Trung t├óm c╞í sß╗ƒ: cho sß╗¡a th├┤ng tin c╞í sß╗ƒ (mß╗Ñc 10) | Dß╗ìc | Ch╞░a bß║»t ─æß║ºu | ΓÇö | ΓÇö | ΓÇö | slice-1 | `slices/slice-27-trung-tam-co-so-edit.md` |
| slice-28 | Ch╞░╞íng tr├¼nh hß╗ìc: tß║ío lß╗¢p chß╗ìn c╞í sß╗ƒ, chß║╖n x├│a lß╗¢p c├│ hß╗ìc vi├¬n, s╞í ─æß╗ô lß╗Ö tr├¼nh cß║Ñp ─æß╗Ö (mß╗Ñc 11) | Dß╗ìc | Ch╞░a bß║»t ─æß║ºu | ΓÇö | ΓÇö | ΓÇö | slice-1 | `slices/slice-28-chuong-trinh-hoc.md` |
| slice-29 | Ghi danh & Quß║ún l├╜ (─æß╗òi t├¬n tß╗½ G├ín c╞í sß╗ƒ): 2 panel ΓÇö HV/GV g├ín theo lß╗¢p, quß║ún l├╜ g├ín theo c╞í sß╗ƒ (mß╗Ñc 12) | Dß╗ìc | Ch╞░a bß║»t ─æß║ºu | ΓÇö | ΓÇö | ΓÇö | slice-1 | `slices/slice-29-ghi-danh-quan-ly.md` |
| slice-30 | Menu Hß╗ìc vi├¬n (mß╗¢i): t├¼m & hß╗ô s╞í chi tiß║┐t hß╗ìc vi├¬n ΓÇö ─æiß╗âm, giß╗¥ hß╗ìc, chuy├¬n cß║ºn, thi, hß╗ìc lß╗▒c (sß╗æ + chart theo panel) (mß╗Ñc 13) | Dß╗ìc | Ch╞░a bß║»t ─æß║ºu | ΓÇö | ΓÇö | ΓÇö | slice-13, slice-5, slice-6 | `slices/slice-30-menu-hoc-vien.md` |
| slice-1.1 | Bß║úo to├án lß╗ïch sß╗¡ ghi danh (thay ─æß╗òi slice-1) | Dß╗ìc | ─Éang l├ám | Notion AI | feature/slice-1.1-lich-su-ghi-danh | ΓÇö | slice-1, slice-6.1 | `slices/slice-1.1-lich-su-ghi-danh.md` |
| slice-6.1 | ─Éiß╗âm danh nhiß╗üu lß╗¢p v├á hiß╗çn diß╗çn (thay ─æß╗òi slice-6) | Dß╗ìc | ─Éang l├ám | Notion AI | feature/slice-6.1-diem-danh-hien-dien | ΓÇö | slice-6, slice-8 | `slices/slice-6.1-diem-danh-hien-dien.md` |

## Trß║íng th├íi hß╗úp lß╗ç

Ch╞░a bß║»t ─æß║ºu, ─Éang l├ám, Review, Done, Done (c├▓n nß╗ú), Ho├ún, ─É├ú hß╗ºy, ─É├ú thay thß║┐. ─Éß╗ïnh ngh─⌐a ─æß║ºy ─æß╗º: xem `../../AGENTS.md`, mß╗Ñc "Quy tr├¼nh thay ─æß╗òi phß║ím vi".

## C├ích th├¬m mß╗Öt Slice/Task mß╗¢i

1. Tß║ío file tß╗½ `slices/_TEMPLATE.md`, ─æß║╖t t├¬n `slices/<id>-<slug>.md`.
2. Th├¬m ─æ├║ng mß╗Öt d├▓ng v├áo bß║úng tr├¬n, trß║íng th├íi "Ch╞░a bß║»t ─æß║ºu".
3. Nß║┐u ─æ├óy l├á thay ─æß╗òi phß║ím vi cß╗ºa mß╗Öt Slice/Task ─æ├ú c├│, ─æß╗ìc `../../AGENTS.md` mß╗Ñc "Quy tr├¼nh thay ─æß╗òi phß║ím vi" tr╞░ß╗¢c.
