-- Tabulka nabídky. Spusťte v Supabase: SQL Editor → New query → Run.

create table if not exists public.cars (
  id            text primary key,
  source        text not null default 'manual',   -- odkud vůz pochází: 'manual', později 'sauto', 'mobile_de', ...
  brand         text not null,
  model         text not null,
  title         text not null,
  price         integer not null,
  year          integer not null,
  mileage       integer not null,
  fuel          text not null,
  transmission  text not null,
  power         integer,
  engine        integer,
  color         text,
  owners        integer,
  stk           text,
  description   text,
  image         text not null default '',
  url           text not null default '',
  is_active     boolean not null default true,
  updated_at    timestamptz not null default now()
);

create index if not exists cars_active_price_idx on public.cars (is_active, price);
create index if not exists cars_source_idx on public.cars (source);

-- Web smí jen číst aktivní vozy. Zápis dělá import přes service_role klíč,
-- který RLS obchází, a anonymní klíč nemá žádná práva k zápisu.
alter table public.cars enable row level security;

drop policy if exists "Veřejné čtení aktivních vozů" on public.cars;
create policy "Veřejné čtení aktivních vozů"
  on public.cars
  for select
  to anon, authenticated
  using (is_active);
