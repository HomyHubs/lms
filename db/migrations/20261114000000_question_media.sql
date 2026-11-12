-- migrate:up
-- slice-12: question images. Assets are content-addressed (sha256) and never rewritten; links are
-- restrict so an image used by a question or an attempt cannot be deleted. See docs/adr/0013-question-media.md.

create table media_assets (
  id uuid primary key default gen_random_uuid(),
  sha256 text not null unique check (sha256 ~ '^[0-9a-f]{64}$'),
  mime text not null check (mime in ('image/png', 'image/jpeg', 'image/webp', 'image/gif')),
  bytes integer not null check (bytes between 1 and 2097152),
  width integer not null check (width between 1 and 4000),
  height integer not null check (height between 1 and 4000),
  storage_key text not null,
  created_by uuid not null references users(id),
  created_at timestamptz not null default now()
);

create table question_media (
  question_id uuid not null references questions(id) on delete cascade,
  position integer not null check (position >= 1),
  media_id uuid not null references media_assets(id) on delete restrict,
  slot text not null check (slot in ('stem', 'option')),
  option_index integer check (option_index between 0 and 25),
  primary key (question_id, position),
  check ((slot = 'option') = (option_index is not null))
);
create unique index question_media_option_key on question_media (question_id, option_index) where slot = 'option';
create index question_media_media_idx on question_media (media_id);

-- Images an attempt's snapshot may show; written with the attempt, read by GET /media/:id for students.
create table exam_attempt_media (
  attempt_id uuid not null references exam_attempts(id) on delete cascade,
  media_id uuid not null references media_assets(id) on delete restrict,
  primary key (attempt_id, media_id)
);
create index exam_attempt_media_media_idx on exam_attempt_media (media_id);

create function protect_question_media() returns trigger language plpgsql as $$
declare
  question_ids uuid[] := '{}';
begin
  if tg_op <> 'INSERT' then question_ids := question_ids || old.question_id; end if;
  if tg_op <> 'DELETE' then question_ids := question_ids || new.question_id; end if;
  if exists (
    select 1 from exam_set_items i join exam_sets s on s.id = i.exam_set_id
    where i.question_id = any(question_ids) and s.status <> 'draft'
  ) then
    raise exception 'Images of a question in a published exam set are immutable' using errcode = 'restrict_violation';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;
create trigger question_media_immutable before insert or update or delete on question_media
for each row execute function protect_question_media();

-- migrate:down
drop trigger question_media_immutable on question_media;
drop function protect_question_media();
drop table exam_attempt_media;
drop table question_media;
drop table media_assets;
