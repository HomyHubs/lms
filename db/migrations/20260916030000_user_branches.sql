-- migrate:up
-- slice-1 Task 4: gan Branch cho User (branch-scoped access).
-- Mot User co the duoc gan 0..n Branch; du lieu theo Branch chi hien trong pham vi duoc gan.
-- Additive (AGENTS.md muc 16): chi them bang moi, dao nguoc duoc.

create table if not exists user_branches (
  user_id uuid not null references users(id) on delete cascade,
  branch_id uuid not null references branches(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, branch_id)
);

create index if not exists user_branches_user_id_idx on user_branches(user_id);
create index if not exists user_branches_branch_id_idx on user_branches(branch_id);

-- migrate:down
drop table if exists user_branches;
