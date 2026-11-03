-- Notificări push către copil: token-ul Expo și limba copilului, pe legătură
alter table public.links add column if not exists child_push_token text;
alter table public.links add column if not exists child_lang text default 'ro';
-- copilul își poate actualiza token-ul și limba pe legătura lui
create policy "child updates own link token" on public.links for update using (auth.uid() = child_id) with check (auth.uid() = child_id);
