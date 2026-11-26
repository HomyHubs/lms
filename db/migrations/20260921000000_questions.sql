-- migrate:up
-- slice-3: Ngan hang cau hoi theo cap do (Starter/Mover/Flyer) + import.
-- Cau hoi phan loai theo Level (levels) / Skill / Type / Difficulty.
-- `options` luu chuoi JSON (string[]) cho cau hoi nhieu lua chon; nullable.
-- Additive (AGENTS.md muc 16): chi them bang moi, dao nguoc duoc.
-- Khong ho tro audio (Listening) / ghi am (Speaking) trong LMS — quyet dinh 2026-11-26 khi huy slice-9:
-- giao vien tu cham va dua ket qua vao lop qua luong cham tay (slice-9a) + cham bai (slice-22).
-- Day la quyet dinh co chu y, KHONG phai no ky thuat.

create table if not exists questions (
  id uuid primary key default gen_random_uuid(),
  level_id uuid not null references levels(id),
  skill text not null check (skill in ('listening', 'speaking', 'reading', 'writing')),
  question_type text not null check (
    question_type in ('multiple_choice', 'fill_blank', 'matching', 'true_false')
  ),
  difficulty text not null check (difficulty in ('easy', 'medium', 'hard')),
  question_text text not null,
  -- Chuoi JSON string[] (vi du: ["A","B","C"]); null neu khong phai cau nhieu lua chon.
  options text,
  correct_answer text not null,
  points integer not null default 1,
  explanation text,
  source_reference text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists questions_level_id_idx on questions(level_id);
create index if not exists questions_skill_idx on questions(skill);
create index if not exists questions_difficulty_idx on questions(difficulty);

-- migrate:down
drop table if exists questions;
