-- migrate:up
-- Task 2 (slice-0): bang `users` toi thieu cho dang nhap SDT + mat khau, va bang
-- `sessions` cho co che Session opaque (theo webapp-template: "Xac thuc = Session opaque").
-- Khong luu plain text: chi luu `password_hash` (bcrypt). Token phien khong luu tho:
-- chi luu SHA-256 hash cua token trong `sessions.token_hash`.

create extension if not exists "pgcrypto";

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  phone_number text not null unique,
  password_hash text not null,
  -- TODO(slice-1): thay role text bang lien ket Branch/role day du (xem slice-1).
  role text not null default 'admin',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists sessions (
  -- Luu SHA-256 hash cua token phien (khong luu token tho de lo DB khong lam lo phien).
  token_hash text primary key,
  user_id uuid not null references users(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create index if not exists sessions_user_id_idx on sessions(user_id);
create index if not exists sessions_expires_at_idx on sessions(expires_at);

-- migrate:down
drop table if exists sessions;
drop table if exists users;
