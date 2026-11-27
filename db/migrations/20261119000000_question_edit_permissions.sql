-- migrate:up
-- slice-19 (ADR 0015): cau hinh quyen sua cau hoi theo role o muc TOAN HE THONG.
-- Mot dong moi role: can_edit = duoc sua cau hoi hay khong. Chi them, dao nguoc duoc.
-- KHONG seed: role thieu dong -> service dung mac dinh (DEFAULT_QUESTION_EDIT_PERMISSIONS),
-- fail-safe ve phia han che (Teacher/Student = false, Staff/Admin/Superadmin = true).

create table if not exists question_edit_permissions (
  role text primary key,
  can_edit boolean not null
);

-- migrate:down
drop table if exists question_edit_permissions;
