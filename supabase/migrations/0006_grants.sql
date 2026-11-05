-- Drepturi de bază pentru utilizatorii autentificați (anonimi). RLS din 0001/0004 rămâne cea care filtrează rândurile.
-- Simptom fără ele: „permission denied for table links” la generarea codului de familie (5 nov 2026).
grant usage on schema public to authenticated, anon;
grant select, insert, update, delete on public.profiles, public.links, public.entries, public.shopping to authenticated;
grant usage, select on all sequences in schema public to authenticated;
alter default privileges in schema public grant select, insert, update, delete on tables to authenticated;
