-- „Din alte țări” (23 nov 2026, Alex: „pe țară + din alte țări”): când feed-ul țării e sărac, sub postările locale apar
-- postări din alte țări traduse automat în limba telefonului. Traducerea se face o singură dată per text și limbă, aici.
create table if not exists public.community_translations (
  kind text not null check (kind in ('p', 'c')),   -- p = postare, c = comentariu
  id bigint not null,
  lang text not null check (char_length(lang) between 2 and 5),
  text text not null,
  t timestamptz not null default now(),
  primary key (kind, id, lang)
);
alter table public.community_translations enable row level security;
grant all on public.community_translations to service_role;
