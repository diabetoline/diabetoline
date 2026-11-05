-- Mesaje scurte între părinte și copil (5 nov 2026). Nu e chat: 2–3 propoziții pe zi, fără poze.
alter table public.links add column if not exists parent_push_token text;
alter table public.links add column if not exists parent_lang text default 'ro';

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  link_id uuid not null references public.links(id) on delete cascade,
  sender text not null check (sender in ('parent','child')),
  body text not null check (char_length(body) between 1 and 200),
  created_at timestamptz not null default now(),
  read_at timestamptz
);
create index if not exists messages_link_t on public.messages(link_id, created_at desc);
alter table public.messages enable row level security;
-- cei doi de pe legătură citesc; fiecare scrie doar ca el însuși; destinatarul marchează citit
create policy "link members read" on public.messages for select
  using (exists (select 1 from public.links l where l.id = messages.link_id and l.status = 'active' and (l.parent_id = auth.uid() or l.child_id = auth.uid())));
create policy "parent writes as parent" on public.messages for insert
  with check (sender = 'parent' and exists (select 1 from public.links l where l.id = messages.link_id and l.status = 'active' and l.parent_id = auth.uid()));
create policy "child writes as child" on public.messages for insert
  with check (sender = 'child' and exists (select 1 from public.links l where l.id = messages.link_id and l.status = 'active' and l.child_id = auth.uid()));
create policy "recipient marks read" on public.messages for update
  using (exists (select 1 from public.links l where l.id = messages.link_id and ((sender = 'child' and l.parent_id = auth.uid()) or (sender = 'parent' and l.child_id = auth.uid()))));
grant select, insert, update on public.messages to authenticated;
-- părintele își pune token-ul de push pe legăturile lui (politica „parent manages links” acoperă deja update-ul)
