-- migrate:up
-- Migration khoi tao cho slice-0 (walking skeleton). Chua co bang nghiep vu that;
-- bang `app_meta` chi de xac minh duong ong migration chay end-to-end voi Postgres that.
-- TODO(slice-0-auth): them bang `users` (id, phone_number, password_hash, role) o Task 2.
create table if not exists app_meta (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

insert into app_meta (key, value)
values ('schema_bootstrap', 'slice-0')
on conflict (key) do nothing;

-- migrate:down
drop table if exists app_meta;
