-- Lista de cumpărături a părintelui, văzută și completată de copil
create table if not exists public.shopping (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null references auth.users(id) on delete cascade,
  client_id text not null,
  name text not null,
  code text,
  level text check (level in ('green','yellow','red')),
  done boolean not null default false,
  added_by text not null default 'parent' check (added_by in ('parent','child')),
  updated_at timestamptz not null default now(),
  unique (parent_id, client_id)
);
alter table public.shopping enable row level security;
create policy "parent owns shopping" on public.shopping for all using (auth.uid() = parent_id) with check (auth.uid() = parent_id);
create policy "child reads parent shopping" on public.shopping for select
  using (exists (select 1 from public.links l where l.parent_id = shopping.parent_id and l.child_id = auth.uid() and l.status = 'active'));
create policy "child adds to parent shopping" on public.shopping for insert
  with check (added_by = 'child' and exists (select 1 from public.links l where l.parent_id = shopping.parent_id and l.child_id = auth.uid() and l.status = 'active'));
create policy "child ticks parent shopping" on public.shopping for update
  using (exists (select 1 from public.links l where l.parent_id = shopping.parent_id and l.child_id = auth.uid() and l.status = 'active'));
