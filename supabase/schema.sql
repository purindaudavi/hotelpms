-- StayPilot PMS flexible record store.
-- Run this in the Supabase SQL editor for the project referenced by .env.

create table if not exists public.staypilot_records (
  id text primary key,
  property_id text not null default 'demo',
  record_type text not null check (
    record_type in (
      'reservations',
      'rooms',
      'housekeeping',
      'transactions',
      'pos_orders',
      'activity_logs',
      'settings'
    )
  ),
  payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists staypilot_records_property_type_idx
  on public.staypilot_records (property_id, record_type, updated_at desc);

alter table public.staypilot_records enable row level security;

drop policy if exists "staypilot authenticated read" on public.staypilot_records;
create policy "staypilot authenticated read"
  on public.staypilot_records
  for select
  to authenticated
  using (true);

drop policy if exists "staypilot authenticated insert" on public.staypilot_records;
create policy "staypilot authenticated insert"
  on public.staypilot_records
  for insert
  to authenticated
  with check (true);

drop policy if exists "staypilot authenticated update" on public.staypilot_records;
create policy "staypilot authenticated update"
  on public.staypilot_records
  for update
  to authenticated
  using (true)
  with check (true);

create or replace function public.set_staypilot_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists staypilot_records_updated_at on public.staypilot_records;
create trigger staypilot_records_updated_at
before update on public.staypilot_records
for each row
execute function public.set_staypilot_updated_at();
