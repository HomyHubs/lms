-- migrate:up
-- slice-1 Task 1: RBAC theo role that (Admin/Teacher/Student/Staff), thay role gia dinh o slice-0.
-- Additive (AGENTS.md muc 16): chi them CHECK constraint + bo default; KHONG sua migration da merge.
-- Giai quyet TODO(slice-1) o migration 20260914010000_users_auth.sql (phan role).

-- 1) Rang buoc role chi nhan 4 vai tro nghiep vu hop le.
alter table users
  drop constraint if exists users_role_check;

alter table users
  add constraint users_role_check
  check (role in ('admin', 'teacher', 'student', 'staff'));

-- 2) Bo gia tri mac dinh 'admin': role phai duoc chi dinh tuong minh khi tao user
--    (khong con "role gia dinh" nhu slice-0; contract CreateUserRequest bat buoc role).
alter table users
  alter column role drop default;

-- migrate:down
alter table users
  alter column role set default 'admin';

alter table users
  drop constraint if exists users_role_check;
