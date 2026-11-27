-- migrate:up
-- slice-26 (tra no TODO(slice-26), ADR 0018): them ngay sinh day du de tinh tuoi CHINH XAC.
-- Chi THEM (additive) va dao nguoc duoc (AGENTS.md muc 16).
--
-- Vi sao KHONG backfill tu birth_year: khong suy ra duoc ngay/thang. Dat mac dinh 01-01 se bien
-- "thieu du lieu" thanh "du lieu sai mot cach tu tin" — tuoi van lech +-1 nhung gio khong con dau
-- hieu nao de biet la uoc luong. Ban ghi cu chi co birth_year duoc coi la uoc luong (xem age.ts).
--
-- Nghiem thu rollback (thu cong, chay tren Postgres test container):
--   1) dbmate --migrations-dir db/migrations up  -> cot users.birth_date ton tai, nullable, kieu date.
--   2) dbmate --migrations-dir db/migrations down -> cot bien mat.
--   3) dbmate --migrations-dir db/migrations up   -> ap dung lai khong loi (IF NOT EXISTS).
-- Harness tu dong: apps/api/scripts/{reset,questions}.integration.mjs chay up -> down(reverse) -> up
-- cho TOAN BO db/migrations, nen file nay tu dong duoc nghiem thu up/down/up khi CI chay.

-- Ngay sinh day du (YYYY-MM-DD). Nullable: user cu / role khac / hoc vien chi biet nam sinh.
alter table users add column if not exists birth_date date;

-- migrate:down
alter table users drop column if exists birth_date;
