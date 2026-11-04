-- Alerte de inactivitate către copil (trimise de server o dată pe zi): când am trimis ultima și de ce fel
alter table public.links add column if not exists last_nudge timestamptz;
alter table public.links add column if not exists last_nudge_kind text;
