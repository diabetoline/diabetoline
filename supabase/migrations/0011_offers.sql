-- Push comercial (22 nov 2026, Alex: „vânzare prin aplicație, chiar dacă nu e folosită activ”; cel mult 2 pe săptămână).
-- Tokenul Expo al fiecărui telefon, anonim (device = id-ul din evenimente), cu opțiunea „Oferte” din Setări.
create table if not exists public.push_tokens (
  device text primary key check (char_length(device) between 8 and 64),
  token text not null,
  lang text,
  country text,
  platform text,
  offers boolean not null default true,
  updated_at timestamptz not null default now()
);
alter table public.push_tokens enable row level security;
grant all on public.push_tokens to service_role;

-- Ce ofertă a primit fiecare telefon și când (pentru limita de 2/săptămână și pentru măsurare).
create table if not exists public.offer_sends (
  id bigint generated always as identity primary key,
  device text not null,
  offer text not null,
  t timestamptz not null default now()
);
create index if not exists offer_sends_device_t_idx on public.offer_sends (device, t desc);
alter table public.offer_sends enable row level security;
grant all on public.offer_sends to service_role;
grant usage, select on all sequences in schema public to service_role;
