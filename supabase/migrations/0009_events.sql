-- Evenimente anonime de utilizare (15 nov 2026): ce apasă omul, nu ce conține (fără nume, fără glicemii, fără poze).
-- `device` = un id aleator generat de aplicație la prima deschidere; `source` = de unde a venit instalarea (cod partener/cutie/reclamă).
-- Scrise de server cu service_role prin /api/track; citite doar de /api/stats (token secret). Nicio politică RLS pentru clienți.
create table if not exists public.events (
  id bigint generated always as identity primary key,
  device text not null check (char_length(device) between 8 and 64),
  name text not null check (char_length(name) between 2 and 40),
  props jsonb not null default '{}'::jsonb,
  country text,
  lang text,
  platform text,
  build text,
  source text,
  t timestamptz not null default now(),
  received_at timestamptz not null default now()
);
create index if not exists events_t_idx on public.events (t desc);
create index if not exists events_name_t_idx on public.events (name, t desc);
create index if not exists events_device_idx on public.events (device, t);
alter table public.events enable row level security;
grant all on public.events to service_role;
grant usage, select on all sequences in schema public to service_role;

-- Rezumatul pentru tabloul de bord: pâlnie (dispozitive distincte pe eveniment), pe zi, pe sursă, retenție.
create or replace function public.app_stats(p_since timestamptz)
returns jsonb language sql stable security definer set search_path = public as $$
with ev as (select * from public.events where t >= p_since),
installs as (select device, min(t) as t0, max(country) as country, max(source) as source, max(platform) as platform from ev where name = 'app_install' group by device),
funnel as (
  select name, count(distinct device) as devices, count(*) as n from ev group by name
),
daily as (
  select date_trunc('day', t)::date as day,
    count(distinct device) filter (where name = 'app_install') as installs,
    count(distinct device) filter (where name = 'trial_start') as trials,
    count(distinct device) filter (where name = 'purchase') as purchases,
    count(distinct device) filter (where name = 'app_open') as active
  from ev group by 1 order by 1
),
by_source as (
  select coalesce(i.source, 'organic') as source,
    count(*) as installs,
    count(*) filter (where exists (select 1 from ev e where e.device = i.device and e.name = 'trial_start')) as trials,
    count(*) filter (where exists (select 1 from ev e where e.device = i.device and e.name = 'purchase')) as purchases
  from installs i group by 1 order by 2 desc
),
by_country as (
  select coalesce(i.country, '?') as country, count(*) as installs,
    count(*) filter (where exists (select 1 from ev e where e.device = i.device and e.name = 'purchase')) as purchases
  from installs i group by 1 order by 2 desc limit 12
),
retention as (
  select
    count(*) as cohort,
    count(*) filter (where exists (select 1 from ev e where e.device = i.device and e.name = 'app_open' and e.t >= i.t0 + interval '1 day' and e.t < i.t0 + interval '2 day')) as d1,
    count(*) filter (where exists (select 1 from ev e where e.device = i.device and e.name = 'app_open' and e.t >= i.t0 + interval '3 day' and e.t < i.t0 + interval '4 day')) as d3,
    count(*) filter (where exists (select 1 from ev e where e.device = i.device and e.name = 'app_open' and e.t >= i.t0 + interval '7 day' and e.t < i.t0 + interval '8 day')) as d7
  from installs i where i.t0 < now() - interval '1 day'
),
plans as (select coalesce(props->>'plan', '?') as plan, count(*) as n from ev where name = 'purchase' group by 1),
first_action as (
  -- câți din cei instalați au făcut ceva real în prima zi (scanare, glicemie, farfurie)
  select count(*) as n from installs i where exists (select 1 from ev e where e.device = i.device and e.name in ('scan_result','glucose_logged','plate_result') and e.t < i.t0 + interval '1 day')
)
select jsonb_build_object(
  'since', p_since,
  'installs', (select count(*) from installs),
  'first_action_day1', (select n from first_action),
  'funnel', (select jsonb_object_agg(name, jsonb_build_object('devices', devices, 'n', n)) from funnel),
  'daily', (select jsonb_agg(to_jsonb(d)) from daily d),
  'by_source', (select jsonb_agg(to_jsonb(b)) from by_source b),
  'by_country', (select jsonb_agg(to_jsonb(c)) from by_country c),
  'retention', (select to_jsonb(r) from retention r),
  'plans', (select jsonb_object_agg(plan, n) from plans)
);
$$;
revoke all on function public.app_stats(timestamptz) from public, anon, authenticated;
grant execute on function public.app_stats(timestamptz) to service_role;
