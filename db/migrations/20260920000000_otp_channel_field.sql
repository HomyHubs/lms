-- migrate:up
-- Slice-2: them cot `channel` vao password_reset_otps de biet OTP duoc gui qua kenh nao
-- (email | whatsapp | telegram). Additive (AGENTS.md muc 16): chi them cot, dao nguoc duoc.
-- Mac dinh 'email' de tuong thich nguoc voi ban ghi cu (slice-0).

alter table password_reset_otps
  add column if not exists channel varchar(20) not null default 'email';

-- migrate:down
alter table password_reset_otps
  drop column if exists channel;
