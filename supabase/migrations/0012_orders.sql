-- Comenzile venite din aplicație (22 nov 2026): webhook-ul Shopify orders/create → /api/shopify-order.
-- Doar ce e nevoie pentru reamintirea de recomandă și pentru măsurare: fără nume, adresă sau email.
create table if not exists public.orders_app (
  order_id bigint primary key,
  device text,
  ctx text,
  items jsonb not null default '[]'::jsonb,
  total numeric,
  currency text,
  country text,
  discount text,
  t timestamptz not null default now(),
  reminded_at timestamptz
);
create index if not exists orders_app_device_t_idx on public.orders_app (device, t desc);
alter table public.orders_app enable row level security;
grant all on public.orders_app to service_role;
