-- migrate:up
-- Task 3 (slice-0): quen mat khau qua OTP gui Email can dia chi email cua user.
-- Them cot `email` (nullable, unique khi co) theo nguyen tac migration additive
-- (AGENTS.md muc 16): them cot moi, khong sua migration da merge.
alter table users add column if not exists email text;

-- Unique nhung cho phep nhieu NULL (user chua co email). Partial unique index.
create unique index if not exists users_email_unique_idx
  on users (email)
  where email is not null;

-- migrate:down
drop index if exists users_email_unique_idx;
alter table users drop column if exists email;
