-- migrate:up
-- slice-23 (ADR 0014): ma hoc vien (student_code) on dinh, tach khoi so dien thoai.
-- Chi THEM (additive) va dao nguoc duoc (AGENTS.md muc 16). Role discriminator: 'student'
-- (xac nhan tu 20260916000000_users_roles.sql va 20261117000000_superadmin_role.sql:
--  CHECK role in ('superadmin','admin','teacher','student','staff')).
--
-- Nghiem thu rollback (thu cong, chay tren Postgres 18 test container):
--   1) dbmate --migrations-dir db/migrations up  -> cot branches.code + users.student_code ton tai;
--      hoc vien cu co ma dang <prefix><nnnn> (vd HN0001, hoac HV0001 neu chua gan co so / branch.code null).
--   2) dbmate --migrations-dir db/migrations down -> ca hai cot + unique index bien mat.
--   3) dbmate --migrations-dir db/migrations up   -> ap dung lai khong loi (idempotent nho IF [NOT] EXISTS
--      va backfill chi dien noi student_code is null).
-- Harness tu dong: apps/api/scripts/{reset,questions}.integration.mjs chay up -> down(reverse) -> up
-- cho TOAN BO db/migrations tren PG18 container (goi tu CI questions-integration.yml / reset-integration.yml),
-- nen file nay tu dong duoc nghiem thu up/down/up khi CI chay.

-- 1) Tien to ma theo co so (vd 'HN','HCM'); nullable.
alter table branches add column if not exists code text;

-- 2) Ma hoc vien; nullable (chi hoc vien bat buoc co, sinh tu dong o tang service).
alter table users add column if not exists student_code text;

-- 3) Unique mot phan: chi duy nhat voi hoc vien va khi ma khong null.
create unique index if not exists users_student_code_unique
  on users (student_code)
  where student_code is not null and role = 'student';

-- 4) Backfill hoc vien hien co chua co ma: prefix = branch.code cua co so gan som nhat
--    (min theo user_branches.created_at, tie-break branch_id), fallback 'HV' khi chua gan hoac code null.
--    So thu tu per-prefix, zero-pad 4 chu so, thu tu on dinh theo (created_at, id).
--    An toan re-run: chi dien noi student_code is null.
with student_prefix as (
  select
    u.id,
    coalesce(
      (
        select b.code
        from user_branches ub
        join branches b on b.id = ub.branch_id
        where ub.user_id = u.id
        order by ub.created_at asc, ub.branch_id asc
        limit 1
      ),
      'HV'
    ) as prefix
  from users u
  where u.role = 'student' and u.student_code is null
),
numbered as (
  select
    sp.id,
    sp.prefix,
    row_number() over (partition by sp.prefix order by u.created_at asc, u.id asc) as seq
  from student_prefix sp
  join users u on u.id = sp.id
)
update users u
set student_code = n.prefix || lpad(n.seq::text, 4, '0')
from numbered n
where u.id = n.id and u.student_code is null;

-- migrate:down
-- Dao nguoc dung thu tu: index -> users.student_code -> branches.code.
drop index if exists users_student_code_unique;
alter table users drop column if exists student_code;
alter table branches drop column if exists code;
