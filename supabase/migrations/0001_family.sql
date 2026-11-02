-- Diabetoline — contul de familie
-- Se rulează o dată în Supabase → SQL Editor. Toate tabelele au RLS: nimeni nu vede nimic fără regulile de mai jos.

-- 1. Profiluri (un rând pe utilizator; utilizatorii sunt anonimi, fără e-mail obligatoriu)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default '',
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy "own profile" on public.profiles for all using (auth.uid() = id) with check (auth.uid() = id);

-- 2. Legături părinte ↔ copil. Părintele generează un cod; copilul îl introduce; părintele poate rupe legătura oricând.
create table if not exists public.links (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null references auth.users(id) on delete cascade,
  child_id uuid references auth.users(id) on delete set null,
  code text not null,
  status text not null default 'pending' check (status in ('pending','active','revoked')),
  parent_name text not null default '',
  child_name text not null default '',
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '1 day'
);
create unique index if not exists links_code_pending on public.links(code) where status = 'pending';
alter table public.links enable row level security;
create policy "parent manages links" on public.links for all using (auth.uid() = parent_id) with check (auth.uid() = parent_id);
create policy "child sees own links" on public.links for select using (auth.uid() = child_id);

-- 3. Intrările din jurnal (glicemii, mese, medicamente, plimbări), ca JSON. Pozele NU se urcă (rămân pe telefon).
create table if not exists public.entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id text not null,
  kind text not null check (kind in ('glucose','meal','med','walk','scan','weight')),
  t timestamptz not null,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (user_id, client_id)
);
create index if not exists entries_user_t on public.entries(user_id, t desc);
alter table public.entries enable row level security;
create policy "own entries" on public.entries for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "child reads parent entries" on public.entries for select
  using (exists (select 1 from public.links l where l.parent_id = entries.user_id and l.child_id = auth.uid() and l.status = 'active'));

-- 4. Copilul acceptă codul: funcție care rulează cu drepturi de server, ca să nu expunem tabelul links la căutare după cod.
create or replace function public.claim_link(p_code text, p_child_name text)
returns table (link_id uuid, parent_name text) language plpgsql security definer set search_path = public as $$
declare l public.links%rowtype;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  select * into l from public.links where code = p_code and status = 'pending' and expires_at > now() limit 1;
  if not found then raise exception 'invalid code'; end if;
  if l.parent_id = auth.uid() then raise exception 'own code'; end if;
  update public.links set child_id = auth.uid(), child_name = left(coalesce(p_child_name,''), 60), status = 'active' where id = l.id;
  return query select l.id, l.parent_name;
end $$;
revoke all on function public.claim_link(text, text) from public;
grant execute on function public.claim_link(text, text) to authenticated;

-- 5. Ștergere completă la cererea utilizatorului (dreptul de a fi uitat)
create or replace function public.delete_me() returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  delete from auth.users where id = auth.uid();
end $$;
revoke all on function public.delete_me() from public;
grant execute on function public.delete_me() to authenticated;
