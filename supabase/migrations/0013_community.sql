-- Comunitate, treapta 1 (22 nov 2026, Alex: „treapta 1 + reacții și comentarii”):
-- „Alții au scanat” pe produs (din evenimentele scan_result, care au acum props.code/name/level), Util / Nu e util,
-- comentarii scurte pe produs (prenume + inițială), 👍, raportare, blocare, moderare de către Alex.
-- Totul prin service_role (serverul); telefonul nu atinge tabelele direct.

-- scanările pe produs: index pe codul din props (scan_result)
create index if not exists events_scan_code_idx on public.events ((props->>'code')) where name = 'scan_result';
create index if not exists events_scan_t_idx on public.events (t desc) where name = 'scan_result';

create table if not exists public.product_votes (
  device text not null check (char_length(device) between 8 and 64),
  code text not null check (char_length(code) between 6 and 40),
  useful boolean not null,
  t timestamptz not null default now(),
  primary key (device, code)
);
create index if not exists product_votes_code_idx on public.product_votes (code);
alter table public.product_votes enable row level security;
grant all on public.product_votes to service_role;

-- postări în comunitate (feed pe țară): text + opțional produsul scanat / farfuria, cu verdictul (ref)
create table if not exists public.community_posts (
  id bigint generated always as identity primary key,
  device text not null,
  name text not null check (char_length(name) between 1 and 40),
  text text not null check (char_length(text) between 1 and 600),
  ref jsonb,
  lang text,
  country text,
  t timestamptz not null default now(),
  hidden boolean not null default false,
  likes integer not null default 0,
  n_comments integer not null default 0,
  last_push_at timestamptz
);
create index if not exists community_posts_country_t_idx on public.community_posts (country, t desc) where hidden = false;
alter table public.community_posts enable row level security;
grant all on public.community_posts to service_role;

-- comentarii: la o postare (post_id) sau la un produs (code)
create table if not exists public.product_comments (
  id bigint generated always as identity primary key,
  code text check (char_length(code) between 6 and 40),
  post_id bigint references public.community_posts (id) on delete cascade,
  device text not null,
  name text not null check (char_length(name) between 1 and 40),
  text text not null check (char_length(text) between 1 and 300),
  lang text,
  country text,
  t timestamptz not null default now(),
  hidden boolean not null default false,
  likes integer not null default 0
);
create index if not exists product_comments_code_t_idx on public.product_comments (code, t desc) where hidden = false;
create index if not exists product_comments_post_t_idx on public.product_comments (post_id, t) where hidden = false;
alter table public.product_comments enable row level security;
grant all on public.product_comments to service_role;

create table if not exists public.comment_likes (
  device text not null,
  comment_id bigint not null references public.product_comments (id) on delete cascade,
  primary key (device, comment_id)
);
alter table public.comment_likes enable row level security;
grant all on public.comment_likes to service_role;

create table if not exists public.community_reports (
  id bigint generated always as identity primary key,
  comment_id bigint not null references public.product_comments (id) on delete cascade,
  device text not null,
  reason text,
  t timestamptz not null default now(),
  resolved boolean not null default false
);
alter table public.community_reports enable row level security;
grant all on public.community_reports to service_role;

-- cine pe cine a blocat (comentariile celui blocat nu se mai văd la cel care a blocat)
create table if not exists public.community_blocks (
  device text not null,
  blocked text not null,
  t timestamptz not null default now(),
  primary key (device, blocked)
);
alter table public.community_blocks enable row level security;
grant all on public.community_blocks to service_role;

-- telefoane interzise de Alex (nu mai pot posta; comentariile lor se ascund)
create table if not exists public.community_bans (
  device text primary key,
  t timestamptz not null default now(),
  reason text
);
alter table public.community_bans enable row level security;
grant all on public.community_bans to service_role;

grant usage, select on all sequences in schema public to service_role;

-- contoare atomice: 👍 pe postare / comentariu, numărul de comentarii pe postare
create or replace function public.bump_post(pid bigint, dlikes integer, dcomments integer) returns void language sql security definer as $$
  update public.community_posts set likes = greatest(0, likes + dlikes), n_comments = greatest(0, n_comments + dcomments) where id = pid;
$$;
revoke all on function public.bump_post(bigint, integer, integer) from public;
grant execute on function public.bump_post(bigint, integer, integer) to service_role;
create table if not exists public.post_likes (
  device text not null,
  post_id bigint not null references public.community_posts (id) on delete cascade,
  primary key (device, post_id)
);
alter table public.post_likes enable row level security;
grant all on public.post_likes to service_role;
-- raportările pot viza și o postare
alter table public.community_reports add column if not exists post_id bigint references public.community_posts (id) on delete cascade;
alter table public.community_reports alter column comment_id drop not null;

-- contorul de 👍 pe comentariu (atomic)
create or replace function public.bump_comment_likes(cid bigint, delta integer) returns void language sql security definer as $$
  update public.product_comments set likes = greatest(0, likes + delta) where id = cid;
$$;
revoke all on function public.bump_comment_likes(bigint, integer) from public;
grant execute on function public.bump_comment_likes(bigint, integer) to service_role;

-- profilul public (23 nov 2026): poza (făcută cu camera din aplicație; galeria vine în build-ul 1.1.3) și insignele
create table if not exists public.community_profiles (
  device text primary key check (char_length(device) between 8 and 64),
  name text,
  photo text,
  t timestamptz not null default now()
);
alter table public.community_profiles enable row level security;
grant all on public.community_profiles to service_role;
alter table public.community_posts add column if not exists badges text[] not null default '{}';
alter table public.product_comments add column if not exists badges text[] not null default '{}';
-- pozele de profil: bucket public, fișiere mici (jpeg ≤ 100 KB, 256 px), numite <device>.jpg
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values ('avatars', 'avatars', true, 204800, array['image/jpeg'])
  on conflict (id) do nothing;

-- pozele farfuriilor distribuite în comunitate (23 nov 2026, Alex: „să fotografieze farfuria și să arate celorlalți”)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values ('plates', 'plates', true, 512000, array['image/jpeg'])
  on conflict (id) do nothing;
