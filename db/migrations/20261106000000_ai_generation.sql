-- migrate:up
-- slice-4.5: AI prompt generation + reverse import. Additive only (AGENTS.md section 16), reversible.
-- questions.source: provenance of a bank question (manual | ai_generated); existing rows default to manual.
-- ai_generation_requests: one prompt generated for an external AI tool (level/skill/count + chosen samples).
-- ai_generated_items: rows pasted back from the external AI, held in a review queue before saving to the bank.
-- JSON text columns hold display-only drafts that are never filtered on (ADR 0005).

alter table questions
  add column if not exists source text not null default 'manual'
    check (source in ('manual', 'ai_generated'));

create table if not exists ai_generation_requests (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references users(id),
  level_id uuid not null references levels(id),
  skill text not null check (skill in ('listening', 'speaking', 'reading', 'writing')),
  question_type text check (question_type in ('multiple_choice', 'fill_blank', 'matching', 'true_false')),
  difficulty text check (difficulty in ('easy', 'medium', 'hard')),
  question_count integer not null check (question_count between 1 and 50),
  sample_question_ids text not null default '[]',
  prompt text not null,
  status text not null default 'draft'
    check (status in ('draft', 'imported', 'reviewed', 'saved_to_bank')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ai_generation_requests_created_by_idx on ai_generation_requests(created_by);

create table if not exists ai_generated_items (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references ai_generation_requests(id) on delete cascade,
  position integer not null,
  payload text not null,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected', 'saved')),
  question_id uuid references questions(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (request_id, position)
);

-- migrate:down
drop table if exists ai_generated_items;
drop table if exists ai_generation_requests;
alter table questions drop column if exists source;
