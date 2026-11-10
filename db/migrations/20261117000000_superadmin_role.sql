-- migrate:up
-- slice-1 (revised 2026-11): them vai tro 'superadmin' — tai khoan cao nhat, vuot moi branch-scope
-- va la role duy nhat quan ly duoc tai khoan 'admin'/'superadmin'.
-- Additive (AGENTS.md muc 16): chi mo rong CHECK constraint; KHONG sua migration da merge.

alter table users
  drop constraint if exists users_role_check;

alter table users
  add constraint users_role_check
  check (role in ('superadmin', 'admin', 'teacher', 'student', 'staff'));

-- migrate:down
alter table users
  drop constraint if exists users_role_check;

alter table users
  add constraint users_role_check
  check (role in ('admin', 'teacher', 'student', 'staff'));
