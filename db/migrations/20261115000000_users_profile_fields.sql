-- migrate:up
-- Slice ho so hoc vien: them cac truong ho so (ho ten, nam sinh, gioi tinh, dia chi, SDT phu huynh).
-- Tat ca nullable de khong pha user cu / role khac (AGENTS.md muc 16: migration additive).
alter table users add column if not exists last_name text;
alter table users add column if not exists first_name text;
alter table users add column if not exists birth_year int;
alter table users add column if not exists gender text check (gender in ('male', 'female', 'other'));
alter table users add column if not exists address text;
alter table users add column if not exists parent_phone text;

-- migrate:down
alter table users drop column if exists parent_phone;
alter table users drop column if exists address;
alter table users drop column if exists gender;
alter table users drop column if exists birth_year;
alter table users drop column if exists first_name;
alter table users drop column if exists last_name;
