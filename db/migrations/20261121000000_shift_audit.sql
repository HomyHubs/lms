-- migrate:up
create table shift_events (
  id bigint generated always as identity primary key,
  shift_id uuid not null,
  user_id uuid not null,
  event_type text not null check (event_type in ('check_in', 'check_out')),
  occurred_at timestamptz not null,
  recorded_by uuid,
  branch_id uuid,
  is_backfilled boolean not null default false,
  unique (shift_id, event_type)
);
create index shift_events_user_time_idx on shift_events(user_id, occurred_at);

-- The actor and branch of old shifts are not known.
insert into shift_events (shift_id, user_id, event_type, occurred_at, is_backfilled)
select id, user_id, 'check_in', check_in_at, true from staff_shifts;
insert into shift_events (shift_id, user_id, event_type, occurred_at, is_backfilled)
select id, user_id, 'check_out', check_out_at, true from staff_shifts where check_out_at is not null;

-- migrate:down
do $$
begin
  if exists (select 1 from shift_events where not is_backfilled) then
    raise exception 'Cannot roll back: shift audit history would be lost';
  end if;
end $$;
drop table shift_events;
