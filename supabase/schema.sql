-- Giorgio Perfumería · esquema de base de datos (Supabase / Postgres)
--
-- Cómo usarlo: en el panel de Supabase, SQL Editor, pegar y ejecutar este archivo; después
-- supabase/storage.sql (fotos) y supabase/seed.sql (datos de ejemplo). Se puede ejecutar más de una vez.
--
-- Quién accede a qué:
--   * La web (clave publicable) solo LEE promos, perfumes y ajustes activos.
--   * Los pedidos solo se crean y se leen desde las funciones de /api (clave secreta),
--     nunca directamente desde el navegador.
--   * El panel de administración (/admin) entra con un usuario de Supabase Auth que esté en la
--     tabla admins: puede editar el catálogo y los ajustes, y cambiar el estado de los pedidos.

-- ---------- Promos ----------
create table if not exists public.promos (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  name        text not null,              -- "2 perfumes"
  title       text not null,              -- "2 perfumes 100 ml" (carrito, pedido, emails)
  detail      text not null default '',   -- "100 ml"
  description text not null default '',
  quantity    int  not null check (quantity between 1 and 12),  -- cuántos perfumes se eligen
  price       int  not null check (price >= 0),                 -- pesos, sin centavos
  art         text not null default 'duo',                      -- ilustración de la tarjeta
  image_url   text,                                             -- foto opcional (etapa 4)
  featured    boolean not null default false,
  active      boolean not null default true,
  position    int not null default 0,
  created_at  timestamptz not null default now()
);

-- ---------- Perfumes ----------
create table if not exists public.perfumes (
  id           uuid primary key default gen_random_uuid(),
  slug         text not null unique,
  name         text not null,
  gender       text not null check (gender in ('hombre', 'mujer', 'unisex')),
  size         text not null default '',
  family       text not null default '',
  notes        text[] not null default '{}',   -- [salida, corazón, fondo]
  bottle_shape text not null default 'flacon', -- ilustración mientras no haya foto
  bottle_tone  text not null default 'smoke',
  image_url    text,                           -- foto opcional (etapa 4)
  stock        boolean not null default true,
  active       boolean not null default true,
  position     int not null default 0,
  created_at   timestamptz not null default now()
);

-- Qué perfumes entran en cada promo
create table if not exists public.promo_perfumes (
  promo_id   uuid not null references public.promos (id) on delete cascade,
  perfume_id uuid not null references public.perfumes (id) on delete cascade,
  primary key (promo_id, perfume_id)
);

-- ---------- Ajustes del negocio (una sola fila) ----------
create table if not exists public.settings (
  id            int primary key default 1 check (id = 1),
  shipping_zone text not null default 'Corrientes Capital',
  shipping_cost int  not null default 3000 check (shipping_cost >= 0),
  shipping_eta  text not null default '24 a 48 h'
);
insert into public.settings (id) values (1) on conflict (id) do nothing;

-- ---------- Pedidos ----------
create table if not exists public.orders (
  id              uuid primary key default gen_random_uuid(),
  number          bigint generated always as identity (start with 1001),
  access_token    uuid not null default gen_random_uuid(),  -- va en el link del pedido; evita adivinar pedidos ajenos
  status          text not null default 'pendiente'
                  check (status in ('pendiente', 'pagado', 'enviado', 'entregado', 'cancelado')),
  -- Datos del cliente y del envío
  customer_name   text not null,
  customer_phone  text not null,
  customer_email  text not null,
  address         text not null,
  address_notes   text not null default '',
  city            text not null,
  -- Foto del combo al momento de comprar:
  -- [{ promo_slug, promo_title, unit_price, perfumes: [{ slug, name, size }] }]
  items           jsonb not null,
  subtotal        int not null,
  shipping_cost   int not null,
  total           int not null,
  -- Mercado Pago
  mp_preference_id text,
  mp_init_point    text,
  mp_payment_id    text,
  payment_status   text,          -- estado que informa Mercado Pago (approved, rejected, ...)
  paid_at          timestamptz,
  emails_sent_at   timestamptz,   -- para no mandar dos veces la confirmación
  created_at       timestamptz not null default now()
);
create index if not exists orders_created_at_idx on public.orders (created_at desc);
create index if not exists orders_status_idx on public.orders (status);

-- ---------- Seguridad (Row Level Security) ----------
alter table public.promos         enable row level security;
alter table public.perfumes       enable row level security;
alter table public.promo_perfumes enable row level security;
alter table public.settings       enable row level security;
alter table public.orders         enable row level security;  -- sin políticas: solo la clave secreta

drop policy if exists "lectura publica de promos activas" on public.promos;
create policy "lectura publica de promos activas" on public.promos
  for select to anon, authenticated using (active);

drop policy if exists "lectura publica de perfumes activos" on public.perfumes;
create policy "lectura publica de perfumes activos" on public.perfumes
  for select to anon, authenticated using (active);

drop policy if exists "lectura publica de promo_perfumes" on public.promo_perfumes;
create policy "lectura publica de promo_perfumes" on public.promo_perfumes
  for select to anon, authenticated using (true);

drop policy if exists "lectura publica de ajustes" on public.settings;
create policy "lectura publica de ajustes" on public.settings
  for select to anon, authenticated using (true);

-- =====================================================================
-- Panel de administración
-- =====================================================================
-- Quién es administrador. La tabla no tiene políticas: solo se carga desde el SQL Editor.
-- Para dar acceso a alguien:
--   1. Authentication > Users > Add user (email y contraseña).
--   2. insert into public.admins (user_id) select id from auth.users where email = 'EMAIL';
create table if not exists public.admins (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.admins enable row level security;

-- true si quien hace la consulta inició sesión y está en la tabla admins.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.admins where user_id = (select auth.uid()));
$$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

-- El administrador ve y edita todo el catálogo (también lo pausado) y los ajustes.
drop policy if exists "admin gestiona promos" on public.promos;
create policy "admin gestiona promos" on public.promos
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admin gestiona perfumes" on public.perfumes;
create policy "admin gestiona perfumes" on public.perfumes
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admin gestiona promo_perfumes" on public.promo_perfumes;
create policy "admin gestiona promo_perfumes" on public.promo_perfumes
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admin edita ajustes" on public.settings;
create policy "admin edita ajustes" on public.settings
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- Pedidos: el administrador los lee y solo puede cambiar el estado.
-- Crear pedidos y registrar pagos sigue siendo tarea exclusiva de las funciones de /api.
drop policy if exists "admin lee pedidos" on public.orders;
create policy "admin lee pedidos" on public.orders
  for select to authenticated using (public.is_admin());

drop policy if exists "admin cambia el estado de pedidos" on public.orders;
create policy "admin cambia el estado de pedidos" on public.orders
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

revoke insert, update, delete on public.orders from anon, authenticated;
grant update (status) on public.orders to authenticated;

-- Reemplaza, en un solo paso, los perfumes de una promo.
create or replace function public.set_promo_perfumes(p_promo uuid, p_perfumes uuid[])
returns void
language plpgsql
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Solo el administrador puede cambiar los perfumes de una promo' using errcode = '42501';
  end if;
  delete from public.promo_perfumes where promo_id = p_promo and perfume_id <> all (p_perfumes);
  insert into public.promo_perfumes (promo_id, perfume_id)
    select p_promo, unnest(p_perfumes)
    on conflict do nothing;
end;
$$;

-- Reemplaza, en un solo paso, las promos en las que entra un perfume.
create or replace function public.set_perfume_promos(p_perfume uuid, p_promos uuid[])
returns void
language plpgsql
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Solo el administrador puede cambiar las promos de un perfume' using errcode = '42501';
  end if;
  delete from public.promo_perfumes where perfume_id = p_perfume and promo_id <> all (p_promos);
  insert into public.promo_perfumes (promo_id, perfume_id)
    select unnest(p_promos), p_perfume
    on conflict do nothing;
end;
$$;
revoke all on function public.set_promo_perfumes(uuid, uuid[]) from public, anon;
revoke all on function public.set_perfume_promos(uuid, uuid[]) from public, anon;
grant execute on function public.set_promo_perfumes(uuid, uuid[]) to authenticated;
grant execute on function public.set_perfume_promos(uuid, uuid[]) to authenticated;
