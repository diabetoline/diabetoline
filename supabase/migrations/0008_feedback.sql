-- Sugestii de funcționalități trimise din aplicație (Mai mult → „Ce ți-ar fi de folos?”). Scrise de server cu cheia service_role; Alex le citește în Table Editor.
create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  body text not null check (char_length(body) between 1 and 1000),
  lang text,
  role text,
  build text,
  email text,
  created_at timestamptz not null default now()
);
alter table public.feedback enable row level security; -- fără politici: doar service_role scrie/citește
alter table public.feedback add column if not exists email text;
-- rolul serverului (service_role) nu primește automat drepturi în acest proiect (vezi și 0006)
grant all on public.feedback to service_role;
grant all on public.messages to service_role;
