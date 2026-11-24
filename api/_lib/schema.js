// Esquema de la base. Se crea solo la primera vez que una función usa la base; cada cambio futuro
// del esquema sube SCHEMA_VERSION y agrega sentencias idempotentes.
export const SCHEMA_VERSION = '1'

export const SCHEMA = [
  'select pg_advisory_xact_lock(42018)',
  `create table if not exists meta (key text primary key, value text not null)`,

  // ---------- Usuarios ----------
  `create table if not exists usuarios (
     id            uuid primary key default gen_random_uuid(),
     nombre        text not null,
     email         text not null unique,
     password_hash text not null,
     rol           text not null check (rol in ('dueno', 'empleado')),
     activo        boolean not null default true,
     created_at    timestamptz not null default now()
   )`,
  `create table if not exists sesiones (
     token_hash text primary key,
     usuario_id uuid not null references usuarios (id) on delete cascade,
     expires_at timestamptz not null,
     created_at timestamptz not null default now()
   )`,
  `create table if not exists intentos_login (
     id bigint generated always as identity primary key,
     key text not null,
     created_at timestamptz not null default now()
   )`,
  'create index if not exists intentos_login_key_idx on intentos_login (key, created_at)',

  // ---------- Ajustes (una fila) ----------
  `create table if not exists ajustes (
     id            int primary key default 1 check (id = 1),
     negocio       text not null default 'Giorgio Perfumería',
     sueldo_dueno  int  not null default 0 check (sueldo_dueno >= 0),
     iva_comision  numeric(5,2) not null default 21,
     redondeo      int  not null default 100 check (redondeo >= 0)
   )`,
  'insert into ajustes (id) values (1) on conflict (id) do nothing',

  // ---------- Medios de pago ----------
  // cuenta: dónde entra la plata (efectivo, banco o mercado_pago).
  `create table if not exists medios_pago (
     id            uuid primary key default gen_random_uuid(),
     nombre        text not null unique,
     cuenta        text not null check (cuenta in ('efectivo', 'banco', 'mercado_pago')),
     comision_pct  numeric(6,3) not null default 0 check (comision_pct >= 0 and comision_pct < 100),
     retencion_pct numeric(6,3) not null default 0 check (retencion_pct >= 0 and retencion_pct < 100),
     aplica_iva    boolean not null default false,
     activo        boolean not null default true,
     orden         int not null default 0
   )`,

  // ---------- Proveedores y productos ----------
  `create table if not exists proveedores (
     id         uuid primary key default gen_random_uuid(),
     nombre     text not null unique,
     telefono   text not null default '',
     notas      text not null default '',
     activo     boolean not null default true,
     created_at timestamptz not null default now()
   )`,
  `create table if not exists productos (
     id            uuid primary key default gen_random_uuid(),
     codigo        text unique,
     nombre        text not null,
     categoria     text not null default '',
     presentacion  text not null default '',
     costo         int  not null default 0 check (costo >= 0),
     precio        int  not null default 0 check (precio >= 0),
     stock         int  not null default 0,
     stock_minimo  int  not null default 0 check (stock_minimo >= 0),
     proveedor_id  uuid references proveedores (id) on delete set null,
     activo        boolean not null default true,
     created_at    timestamptz not null default now()
   )`,
  'create index if not exists productos_nombre_idx on productos (lower(nombre))',
  // Cada cambio de stock queda registrado: ingreso, venta, ajuste, anulación.
  `create table if not exists movimientos_stock (
     id          bigint generated always as identity primary key,
     producto_id uuid not null references productos (id) on delete cascade,
     tipo        text not null check (tipo in ('ingreso', 'venta', 'ajuste', 'anulacion', 'compra')),
     cantidad    int  not null,
     stock_final int  not null,
     costo_unit  int,
     motivo      text not null default '',
     ref_id      uuid,
     usuario_id  uuid references usuarios (id) on delete set null,
     created_at  timestamptz not null default now()
   )`,
  'create index if not exists movimientos_stock_producto_idx on movimientos_stock (producto_id, created_at desc)',

  // ---------- Ventas (se cargan a mano: no hay caja ni facturación) ----------
  `create table if not exists ventas (
     id            uuid primary key default gen_random_uuid(),
     numero        bigint generated always as identity (start with 1),
     fecha         date not null default current_date,
     cliente       text not null default '',
     medio_pago_id uuid references medios_pago (id) on delete set null,
     medio_nombre  text not null,
     cuenta        text not null,
     subtotal      int not null,
     descuento     int not null default 0,
     total         int not null,
     costo         int not null,
     comision      int not null default 0,
     estado        text not null default 'ok' check (estado in ('ok', 'anulada')),
     nota          text not null default '',
     usuario_id    uuid references usuarios (id) on delete set null,
     created_at    timestamptz not null default now()
   )`,
  'create index if not exists ventas_fecha_idx on ventas (fecha desc)',
  `create table if not exists venta_items (
     id          bigint generated always as identity primary key,
     venta_id    uuid not null references ventas (id) on delete cascade,
     producto_id uuid references productos (id) on delete set null,
     nombre      text not null,
     cantidad    int not null check (cantidad > 0),
     precio_unit int not null check (precio_unit >= 0),
     costo_unit  int not null default 0
   )`,

  // ---------- Compras a proveedores y deudas ----------
  `create table if not exists compras (
     id           uuid primary key default gen_random_uuid(),
     numero       bigint generated always as identity (start with 1),
     proveedor_id uuid references proveedores (id) on delete set null,
     fecha        date not null default current_date,
     vencimiento  date,
     total        int not null check (total >= 0),
     nota         text not null default '',
     estado       text not null default 'ok' check (estado in ('ok', 'anulada')),
     usuario_id   uuid references usuarios (id) on delete set null,
     created_at   timestamptz not null default now()
   )`,
  `create table if not exists compra_items (
     id          bigint generated always as identity primary key,
     compra_id   uuid not null references compras (id) on delete cascade,
     producto_id uuid references productos (id) on delete set null,
     nombre      text not null,
     cantidad    int not null check (cantidad > 0),
     costo_unit  int not null check (costo_unit >= 0)
   )`,

  // ---------- Gastos fijos (lo que se paga todos los meses) ----------
  `create table if not exists gastos_fijos (
     id       uuid primary key default gen_random_uuid(),
     nombre   text not null unique,
     monto    int  not null check (monto >= 0),
     dia_pago int  check (dia_pago between 1 and 31),
     activo   boolean not null default true,
     orden    int not null default 0
   )`,

  // ---------- Caja: toda la plata que entra y sale, por cuenta ----------
  // categoria: venta, aporte, otro_ingreso | gasto_fijo, gasto_variable, pago_proveedor, retiro, otro_egreso
  `create table if not exists caja (
     id            uuid primary key default gen_random_uuid(),
     fecha         date not null default current_date,
     tipo          text not null check (tipo in ('ingreso', 'egreso')),
     cuenta        text not null check (cuenta in ('efectivo', 'banco', 'mercado_pago')),
     monto         int  not null check (monto > 0),
     categoria     text not null,
     descripcion   text not null default '',
     venta_id      uuid references ventas (id) on delete cascade,
     compra_id     uuid references compras (id) on delete set null,
     proveedor_id  uuid references proveedores (id) on delete set null,
     gasto_fijo_id uuid references gastos_fijos (id) on delete set null,
     usuario_id    uuid references usuarios (id) on delete set null,
     created_at    timestamptz not null default now()
   )`,
  'create index if not exists caja_fecha_idx on caja (fecha desc)',
  // ---------- Operaciones que tocan varias tablas: cada una en un solo paso ----------
  // Lo que se lleva el medio de pago (misma cuenta que descuentoMedio() en shared/finanzas.js).
  `create or replace function descuento_medio(p_total int, p_medio uuid)
   returns int language sql stable as $$
     select coalesce((
       select round(p_total * m.comision_pct / 100)::int
            + case when m.aplica_iva then round(round(p_total * m.comision_pct / 100) * a.iva_comision / 100)::int else 0 end
            + round(p_total * m.retencion_pct / 100)::int
         from medios_pago m, ajustes a where m.id = p_medio and a.id = 1
     ), 0)
   $$`,

  // Venta cargada a mano: guarda la venta con el costo del momento, descuenta stock y anota el cobro en caja.
  `create or replace function registrar_venta(p jsonb)
   returns uuid language plpgsql as $$
   declare
     v_id uuid;
     v_medio medios_pago%rowtype;
     v_subtotal int;
     v_descuento int := coalesce((p->>'descuento')::int, 0);
     v_total int;
     v_comision int;
     it record;
   begin
     select * into v_medio from medios_pago where id = (p->>'medio_pago_id')::uuid;
     if not found then raise exception 'medio_invalido'; end if;

     select coalesce(sum((i->>'cantidad')::int * (i->>'precio_unit')::int), 0) into v_subtotal
       from jsonb_array_elements(p->'items') i;
     if v_subtotal <= 0 then raise exception 'venta_vacia'; end if;
     if v_descuento < 0 or v_descuento > v_subtotal then raise exception 'descuento_invalido'; end if;
     v_total := v_subtotal - v_descuento;
     v_comision := descuento_medio(v_total, v_medio.id);

     insert into ventas (fecha, cliente, medio_pago_id, medio_nombre, cuenta, subtotal, descuento, total, costo, comision, nota, usuario_id)
     values (coalesce((p->>'fecha')::date, current_date), coalesce(p->>'cliente', ''), v_medio.id, v_medio.nombre, v_medio.cuenta,
             v_subtotal, v_descuento, v_total, 0, v_comision, coalesce(p->>'nota', ''), (p->>'usuario_id')::uuid)
     returning id into v_id;

     for it in
       select pr.id, pr.nombre, pr.costo, (i->>'cantidad')::int as cantidad, (i->>'precio_unit')::int as precio_unit
         from jsonb_array_elements(p->'items') i
         join productos pr on pr.id = (i->>'producto_id')::uuid
     loop
       insert into venta_items (venta_id, producto_id, nombre, cantidad, precio_unit, costo_unit)
       values (v_id, it.id, it.nombre, it.cantidad, it.precio_unit, it.costo);
       update productos set stock = stock - it.cantidad where id = it.id;
       insert into movimientos_stock (producto_id, tipo, cantidad, stock_final, costo_unit, motivo, ref_id, usuario_id)
       select it.id, 'venta', -it.cantidad, stock, it.costo, 'Venta', v_id, (p->>'usuario_id')::uuid from productos where id = it.id;
     end loop;

     if (select count(*) from venta_items where venta_id = v_id) <> jsonb_array_length(p->'items') then
       raise exception 'producto_invalido';
     end if;

     update ventas set costo = (select coalesce(sum(cantidad * costo_unit), 0) from venta_items where venta_id = v_id)
      where id = v_id;
     if v_total - v_comision > 0 then
       insert into caja (fecha, tipo, cuenta, monto, categoria, descripcion, venta_id, usuario_id)
       select fecha, 'ingreso', cuenta, v_total - v_comision, 'venta',
              'Venta ' || numero || case when v_comision > 0 then ' (descontada la comisión de ' || v_medio.nombre || ')' else '' end,
              id, usuario_id
         from ventas where id = v_id;
     end if;
     return v_id;
   end
   $$`,

  // Anular una venta: vuelve el stock y saca el cobro de la caja.
  `create or replace function anular_venta(p_id uuid, p_usuario uuid)
   returns boolean language plpgsql as $$
   declare it record;
   begin
     update ventas set estado = 'anulada' where id = p_id and estado = 'ok';
     if not found then return false; end if;
     for it in select producto_id, cantidad from venta_items where venta_id = p_id and producto_id is not null loop
       update productos set stock = stock + it.cantidad where id = it.producto_id;
       insert into movimientos_stock (producto_id, tipo, cantidad, stock_final, motivo, ref_id, usuario_id)
       select it.producto_id, 'anulacion', it.cantidad, stock, 'Venta anulada', p_id, p_usuario
         from productos where id = it.producto_id;
     end loop;
     delete from caja where venta_id = p_id;
     return true;
   end
   $$`,

  // Compra a un proveedor: suma stock, actualiza el costo si se pide y, si se pagó algo, lo saca de la caja.
  `create or replace function registrar_compra(p jsonb)
   returns uuid language plpgsql as $$
   declare
     v_id uuid;
     v_total int;
     v_pago int := coalesce((p->'pago'->>'monto')::int, 0);
     it record;
   begin
     select coalesce(sum((i->>'cantidad')::int * (i->>'costo_unit')::int), 0) into v_total
       from jsonb_array_elements(p->'items') i;
     if jsonb_array_length(p->'items') = 0 then raise exception 'compra_vacia'; end if;
     if v_pago < 0 or v_pago > v_total then raise exception 'pago_invalido'; end if;

     insert into compras (proveedor_id, fecha, vencimiento, total, nota, usuario_id)
     values ((p->>'proveedor_id')::uuid, coalesce((p->>'fecha')::date, current_date), (p->>'vencimiento')::date,
             v_total, coalesce(p->>'nota', ''), (p->>'usuario_id')::uuid)
     returning id into v_id;

     for it in
       select pr.id, pr.nombre, (i->>'cantidad')::int as cantidad, (i->>'costo_unit')::int as costo_unit
         from jsonb_array_elements(p->'items') i
         join productos pr on pr.id = (i->>'producto_id')::uuid
     loop
       insert into compra_items (compra_id, producto_id, nombre, cantidad, costo_unit)
       values (v_id, it.id, it.nombre, it.cantidad, it.costo_unit);
       update productos
          set stock = stock + it.cantidad,
              costo = case when coalesce((p->>'actualizar_costo')::boolean, true) then it.costo_unit else costo end
        where id = it.id;
       insert into movimientos_stock (producto_id, tipo, cantidad, stock_final, costo_unit, motivo, ref_id, usuario_id)
       select it.id, 'compra', it.cantidad, stock, it.costo_unit, 'Compra', v_id, (p->>'usuario_id')::uuid
         from productos where id = it.id;
     end loop;

     if (select count(*) from compra_items where compra_id = v_id) <> jsonb_array_length(p->'items') then
       raise exception 'producto_invalido';
     end if;

     if v_pago > 0 then
       insert into caja (fecha, tipo, cuenta, monto, categoria, descripcion, compra_id, proveedor_id, usuario_id)
       select fecha, 'egreso', p->'pago'->>'cuenta', v_pago, 'pago_proveedor', 'Pago de la compra ' || numero,
              id, proveedor_id, usuario_id
         from compras where id = v_id;
     end if;
     return v_id;
   end
   $$`,

  // Anular una compra: saca del stock lo que había entrado y borra sus pagos de la caja.
  `create or replace function anular_compra(p_id uuid, p_usuario uuid)
   returns boolean language plpgsql as $$
   declare it record;
   begin
     update compras set estado = 'anulada' where id = p_id and estado = 'ok';
     if not found then return false; end if;
     for it in select producto_id, cantidad from compra_items where compra_id = p_id and producto_id is not null loop
       update productos set stock = stock - it.cantidad where id = it.producto_id;
       insert into movimientos_stock (producto_id, tipo, cantidad, stock_final, motivo, ref_id, usuario_id)
       select it.producto_id, 'anulacion', -it.cantidad, stock, 'Compra anulada', p_id, p_usuario
         from productos where id = it.producto_id;
     end loop;
     delete from caja where compra_id = p_id;
     return true;
   end
   $$`,

  // Cambio de stock suelto: ingreso (suma) o ajuste por conteo (deja el stock en el número contado).
  `create or replace function mover_stock(p_producto uuid, p_tipo text, p_cantidad int, p_motivo text, p_usuario uuid)
   returns int language plpgsql as $$
   declare v_actual int; v_dif int;
   begin
     select stock into v_actual from productos where id = p_producto for update;
     if not found then raise exception 'producto_invalido'; end if;
     v_dif := case when p_tipo = 'ajuste' then p_cantidad - v_actual else p_cantidad end;
     if v_dif = 0 then return v_actual; end if;
     update productos set stock = stock + v_dif where id = p_producto;
     insert into movimientos_stock (producto_id, tipo, cantidad, stock_final, motivo, usuario_id)
     values (p_producto, p_tipo, v_dif, v_actual + v_dif, coalesce(p_motivo, ''), p_usuario);
     return v_actual + v_dif;
   end
   $$`,
]

/** Datos con los que arranca una base nueva: medios de pago y gastos fijos típicos, editables. */
export const SEED = [
  [
    `insert into medios_pago (nombre, cuenta, comision_pct, retencion_pct, aplica_iva, orden)
     select * from (values
       ('Efectivo', 'efectivo', 0::numeric, 0::numeric, false, 0),
       ('Transferencia', 'banco', 0, 0, false, 1),
       ('Débito', 'banco', 0.8, 0, true, 2),
       ('Crédito en 1 pago', 'banco', 1.8, 0, true, 3),
       ('Mercado Pago', 'mercado_pago', 6.29, 0, true, 4)
     ) as v (nombre, cuenta, comision_pct, retencion_pct, aplica_iva, orden)
     where not exists (select 1 from meta where key = 'seeded')
     on conflict (nombre) do nothing`,
  ],
  [
    `insert into gastos_fijos (nombre, monto, orden)
     select * from (values ('Alquiler', 0, 0), ('Monotributo', 0, 1), ('Servicios (luz, internet, teléfono)', 0, 2),
       ('Sueldos de empleados', 0, 3), ('Publicidad', 0, 4)) as v (nombre, monto, orden)
     where not exists (select 1 from meta where key = 'seeded')
     on conflict (nombre) do nothing`,
  ],
  ["insert into meta (key, value) values ('seeded', now()::text) on conflict (key) do nothing"],
]

let ready = null

export function ensureSchema(sql) {
  ready ??= migrate(sql).catch((error) => {
    ready = null
    throw error
  })
  return ready
}

export const resetSchemaCache = () => {
  ready = null
}

async function migrate(sql) {
  const [{ exists }] = await sql.query("select to_regclass('meta') is not null as exists")
  if (exists) {
    const [row] = await sql.query("select value from meta where key = 'schema_version'")
    if (row?.value === SCHEMA_VERSION) return
  }
  await sql.batch([
    ...SCHEMA.map((text) => [text]),
    ...SEED,
    [
      "insert into meta (key, value) values ('schema_version', $1) on conflict (key) do update set value = excluded.value",
      [SCHEMA_VERSION],
    ],
  ])
}
