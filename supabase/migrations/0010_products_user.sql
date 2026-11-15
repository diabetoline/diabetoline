-- Baza comună de produse citite din poză (15 nov 2026): când un om pozează eticheta unui produs care nu e în Open Food Facts,
-- valorile confirmate de el ajung aici, iar următorul care scanează același cod le primește gata citite (/api/product).
-- Scris și citit doar de server (service_role). Fără date personale: codul, valorile la 100 g, numele, limba.
create table if not exists public.products_user (
  code text primary key check (char_length(code) between 6 and 20),
  product jsonb not null,
  lang text,
  confirmations int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.products_user enable row level security;
grant all on public.products_user to service_role;
