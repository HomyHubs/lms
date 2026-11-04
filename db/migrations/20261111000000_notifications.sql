-- migrate:up
-- slice-9b: automatic reminders (retake, teaching schedule). One row is both the in-app
-- notification (bell) and the outbox entry for the external channel. See docs/adr/0010-notifications.md.

create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  kind text not null check (kind in ('retake_reminder', 'session_reminder')),
  title text not null,
  body text not null,
  -- One reminder per event and recipient: re-running the scan never duplicates.
  dedupe_key text not null unique,
  channel text not null check (channel in ('console', 'whatsapp', 'telegram')),
  delivery_status text not null default 'pending' check (delivery_status in ('pending', 'sent', 'failed')),
  delivery_attempts integer not null default 0 check (delivery_attempts >= 0),
  last_error text,
  sent_at timestamptz,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_created_idx on notifications(user_id, created_at desc);
create index if not exists notifications_pending_idx on notifications(created_at) where delivery_status = 'pending';

-- migrate:down
drop table if exists notifications;
