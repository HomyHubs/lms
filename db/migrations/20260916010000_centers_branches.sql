-- migrate:up
-- slice-1 Task 2: Center (trung tam) + Branch (co so). 1 Center co nhieu Branch.
-- Additive (AGENTS.md muc 16): chi them bang moi, khong sua migration da merge. Dao nguoc duoc.

create table if not exists centers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists branches (
  id uuid primary key default gen_random_uuid(),
  -- Xoa Center thi xoa luon Branch truc thuoc (khong de Branch mo coi).
  center_id uuid not null references centers(id) on delete cascade,
  name text not null,
  address text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists branches_center_id_idx on branches(center_id);

-- migrate:down
drop table if exists branches;
drop table if exists centers;
