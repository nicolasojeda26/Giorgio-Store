// Esquema de la base. Se crea solo la primera vez que una función usa la base; cada cambio futuro
// del esquema sube SCHEMA_VERSION y agrega sentencias idempotentes.
export const SCHEMA_VERSION = '2'

// Gastos fijos con los que arranca: generales del negocio y, en cada local, los propios (todos en $0, editables).
const GASTOS_INICIALES = `insert into gastos_fijos (nombre, monto, orden, sucursal_id)
  select nombre, 0, orden, sucursal_id from (
    select g.nombre, g.orden, null::uuid as sucursal_id
      from (values ('Monotributo', 0), ('Publicidad', 1)) as g (nombre, orden)
    union all
    select l.nombre, 10 + s.orden * 10 + l.orden, s.id
      from sucursales s
      cross join (values ('Alquiler', 0), ('Servicios (luz, internet, teléfono)', 1), ('Sueldos de empleados', 2)) as l (nombre, orden)
  ) as v`

export const SCHEMA = [
  'select pg_advisory_xact_lock(42018)',
  `create table if not exists meta (key text primary key, value text not null)`,

  // ---------- Sucursales (locales) ----------
  `create table if not exists sucursales (
     id         uuid primary key default gen_random_uuid(),
     nombre     text not null unique,
     direccion  text not null default '',
     activo     boolean not null default true,
     orden      int not null default 0,
     created_at timestamptz not null default now()
   )`,
  `insert into sucursales (nombre, direccion, orden)
   select * from (values ('Irigoyen', 'Irigoyen 2498', 0), ('Sucursal 2', '', 1)) as v (nombre, direccion, orden)
   where not exists (select 1 from sucursales)`,

  // ---------- Usuarios ----------
  // dueno: todo. encargado: su local (stock, caja, ventas). vendedor: vende e ingresa mercadería en su local.
  `create table if not exists usuarios (
     id            uuid primary key default gen_random_uuid(),
     nombre        text not null,
     email         text not null unique,
     password_hash text not null,
     rol           text not null,
     sucursal_id   uuid references sucursales (id) on delete set null,
     activo        boolean not null default true,
     created_at    timestamptz not null default now()
   )`,
  // v1 tenía 'empleado' y ningún local: pasan a vendedor del primer local.
  'alter table usuarios add column if not exists sucursal_id uuid references sucursales (id) on delete set null',
  'alter table usuarios drop constraint if exists usuarios_rol_check',
  "update usuarios set rol = 'vendedor' where rol = 'empleado'",
  `update usuarios set sucursal_id = (select id from sucursales order by orden, nombre limit 1)
    where rol <> 'dueno' and sucursal_id is null`,
  "alter table usuarios add constraint usuarios_rol_check check (rol in ('dueno', 'encargado', 'vendedor'))",
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
     stock_minimo  int  not null default 0 check (stock_minimo >= 0),
     proveedor_id  uuid references proveedores (id) on delete set null,
     activo        boolean not null default true,
     created_at    timestamptz not null default now()
   )`,
  'create index if not exists productos_nombre_idx on productos (lower(nombre))',
  // Stock de cada producto en cada local (el stock mínimo es el mismo para los dos).
  `create table if not exists existencias (
     producto_id uuid not null references productos (id) on delete cascade,
     sucursal_id uuid not null references sucursales (id) on delete cascade,
     cantidad    int  not null default 0,
     primary key (producto_id, sucursal_id)
   )`,
  // v1 guardaba un solo stock en productos: pasa al primer local.
  `do $$ begin
     if exists (select 1 from information_schema.columns where table_name = 'productos' and column_name = 'stock') then
       insert into existencias (producto_id, sucursal_id, cantidad)
       select id, (select id from sucursales order by orden, nombre limit 1), stock from productos where stock <> 0
       on conflict do nothing;
       alter table productos drop column stock;
     end if;
   end $$`,
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
  'alter table movimientos_stock add column if not exists sucursal_id uuid references sucursales (id) on delete restrict',
  `update movimientos_stock set sucursal_id = (select id from sucursales order by orden, nombre limit 1) where sucursal_id is null`,
  'alter table movimientos_stock alter column sucursal_id set not null',
  'alter table movimientos_stock drop constraint if exists movimientos_stock_tipo_check',
  `alter table movimientos_stock add constraint movimientos_stock_tipo_check
     check (tipo in ('ingreso', 'venta', 'ajuste', 'anulacion', 'compra', 'traspaso'))`,

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
  'alter table ventas add column if not exists sucursal_id uuid references sucursales (id) on delete restrict',
  `update ventas set sucursal_id = (select id from sucursales order by orden, nombre limit 1) where sucursal_id is null`,
  'alter table ventas alter column sucursal_id set not null',
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
  'alter table compras add column if not exists sucursal_id uuid references sucursales (id) on delete restrict',
  `update compras set sucursal_id = (select id from sucursales order by orden, nombre limit 1) where sucursal_id is null`,
  'alter table compras alter column sucursal_id set not null',
  `create table if not exists compra_items (
     id          bigint generated always as identity primary key,
     compra_id   uuid not null references compras (id) on delete cascade,
     producto_id uuid references productos (id) on delete set null,
     nombre      text not null,
     cantidad    int not null check (cantidad > 0),
     costo_unit  int not null check (costo_unit >= 0)
   )`,

  // ---------- Gastos fijos (lo que se paga todos los meses) ----------
  // sucursal_id vacío = gasto general del negocio (monotributo, contador...), si no, gasto de ese local.
  `create table if not exists gastos_fijos (
     id       uuid primary key default gen_random_uuid(),
     nombre   text not null,
     monto    int  not null check (monto >= 0),
     dia_pago int  check (dia_pago between 1 and 31),
     activo   boolean not null default true,
     orden    int not null default 0
   )`,

  'alter table gastos_fijos add column if not exists sucursal_id uuid references sucursales (id) on delete cascade',
  'alter table gastos_fijos drop constraint if exists gastos_fijos_nombre_key',
  `create unique index if not exists gastos_fijos_nombre_idx
     on gastos_fijos (coalesce(sucursal_id::text, ''), lower(nombre))`,

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
  'alter table caja add column if not exists sucursal_id uuid references sucursales (id) on delete restrict',
  `update caja set sucursal_id = (select id from sucursales order by orden, nombre limit 1) where sucursal_id is null`,
  'alter table caja alter column sucursal_id set not null',

  // Bases de v1 sin usar todavía (gastos en $0, ninguno pagado): pasan a gastos generales + gastos de cada local.
  `do $$ begin
     if exists (select 1 from gastos_fijos)
        and not exists (select 1 from gastos_fijos where monto > 0 or sucursal_id is not null)
        and not exists (select 1 from caja where gasto_fijo_id is not null) then
       delete from gastos_fijos;
       ${GASTOS_INICIALES};
     end if;
   end $$`,

  // ---------- Traspasos de mercadería entre locales ----------
  `create table if not exists traspasos (
     id         uuid primary key default gen_random_uuid(),
     numero     bigint generated always as identity (start with 1),
     fecha      date not null default current_date,
     origen_id  uuid not null references sucursales (id),
     destino_id uuid not null references sucursales (id),
     nota       text not null default '',
     estado     text not null default 'ok' check (estado in ('ok', 'anulado')),
     usuario_id uuid references usuarios (id) on delete set null,
     created_at timestamptz not null default now(),
     check (origen_id <> destino_id)
   )`,
  `create table if not exists traspaso_items (
     id          bigint generated always as identity primary key,
     traspaso_id uuid not null references traspasos (id) on delete cascade,
     producto_id uuid references productos (id) on delete set null,
     nombre      text not null,
     cantidad    int not null check (cantidad > 0)
   )`,
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

  // Suma (o resta) stock de un producto en un local, deja el movimiento anotado y devuelve el stock nuevo.
  `create or replace function cambiar_stock(p_producto uuid, p_sucursal uuid, p_dif int, p_tipo text, p_motivo text,
                                            p_ref uuid, p_usuario uuid, p_costo int default null)
   returns int language plpgsql as $$
   declare v_stock int;
   begin
     insert into existencias (producto_id, sucursal_id, cantidad) values (p_producto, p_sucursal, p_dif)
     on conflict (producto_id, sucursal_id) do update set cantidad = existencias.cantidad + excluded.cantidad
     returning cantidad into v_stock;
     insert into movimientos_stock (producto_id, sucursal_id, tipo, cantidad, stock_final, costo_unit, motivo, ref_id, usuario_id)
     values (p_producto, p_sucursal, p_tipo, p_dif, v_stock, p_costo, coalesce(p_motivo, ''), p_ref, p_usuario);
     return v_stock;
   end
   $$`,

  // Venta cargada a mano en un local: guarda la venta con el costo del momento, descuenta stock de ese local
  // y anota el cobro en su caja.
  `create or replace function registrar_venta(p jsonb)
   returns uuid language plpgsql as $$
   declare
     v_id uuid;
     v_medio medios_pago%rowtype;
     v_sucursal uuid := (p->>'sucursal_id')::uuid;
     v_subtotal int;
     v_descuento int := coalesce((p->>'descuento')::int, 0);
     v_total int;
     v_comision int;
     it record;
   begin
     if not exists (select 1 from sucursales where id = v_sucursal and activo) then raise exception 'sucursal_invalida'; end if;
     select * into v_medio from medios_pago where id = (p->>'medio_pago_id')::uuid;
     if not found then raise exception 'medio_invalido'; end if;

     select coalesce(sum((i->>'cantidad')::int * (i->>'precio_unit')::int), 0) into v_subtotal
       from jsonb_array_elements(p->'items') i;
     if v_subtotal <= 0 then raise exception 'venta_vacia'; end if;
     if v_descuento < 0 or v_descuento > v_subtotal then raise exception 'descuento_invalido'; end if;
     v_total := v_subtotal - v_descuento;
     v_comision := descuento_medio(v_total, v_medio.id);

     insert into ventas (sucursal_id, fecha, cliente, medio_pago_id, medio_nombre, cuenta, subtotal, descuento, total, costo,
                         comision, nota, usuario_id)
     values (v_sucursal, coalesce((p->>'fecha')::date, current_date), coalesce(p->>'cliente', ''), v_medio.id, v_medio.nombre,
             v_medio.cuenta, v_subtotal, v_descuento, v_total, 0, v_comision, coalesce(p->>'nota', ''), (p->>'usuario_id')::uuid)
     returning id into v_id;

     for it in
       select pr.id, pr.nombre, pr.costo, (i->>'cantidad')::int as cantidad, (i->>'precio_unit')::int as precio_unit
         from jsonb_array_elements(p->'items') i
         join productos pr on pr.id = (i->>'producto_id')::uuid
     loop
       insert into venta_items (venta_id, producto_id, nombre, cantidad, precio_unit, costo_unit)
       values (v_id, it.id, it.nombre, it.cantidad, it.precio_unit, it.costo);
       perform cambiar_stock(it.id, v_sucursal, -it.cantidad, 'venta', 'Venta', v_id, (p->>'usuario_id')::uuid, it.costo);
     end loop;

     if (select count(*) from venta_items where venta_id = v_id) <> jsonb_array_length(p->'items') then
       raise exception 'producto_invalido';
     end if;

     update ventas set costo = (select coalesce(sum(cantidad * costo_unit), 0) from venta_items where venta_id = v_id)
      where id = v_id;
     if v_total - v_comision > 0 then
       insert into caja (sucursal_id, fecha, tipo, cuenta, monto, categoria, descripcion, venta_id, usuario_id)
       select sucursal_id, fecha, 'ingreso', cuenta, v_total - v_comision, 'venta',
              'Venta ' || numero || case when v_comision > 0 then ' (descontada la comisión de ' || v_medio.nombre || ')' else '' end,
              id, usuario_id
         from ventas where id = v_id;
     end if;
     return v_id;
   end
   $$`,

  // Anular una venta: vuelve el stock al local y saca el cobro de la caja.
  `create or replace function anular_venta(p_id uuid, p_usuario uuid)
   returns boolean language plpgsql as $$
   declare it record; v_sucursal uuid;
   begin
     update ventas set estado = 'anulada' where id = p_id and estado = 'ok' returning sucursal_id into v_sucursal;
     if not found then return false; end if;
     for it in select producto_id, cantidad from venta_items where venta_id = p_id and producto_id is not null loop
       perform cambiar_stock(it.producto_id, v_sucursal, it.cantidad, 'anulacion', 'Venta anulada', p_id, p_usuario);
     end loop;
     delete from caja where venta_id = p_id;
     return true;
   end
   $$`,

  // Compra a un proveedor que llega a un local: suma stock ahí, actualiza el costo si se pide y, si se pagó algo,
  // lo saca de la caja de ese local.
  `create or replace function registrar_compra(p jsonb)
   returns uuid language plpgsql as $$
   declare
     v_id uuid;
     v_sucursal uuid := (p->>'sucursal_id')::uuid;
     v_total int;
     v_pago int := coalesce((p->'pago'->>'monto')::int, 0);
     it record;
   begin
     if not exists (select 1 from sucursales where id = v_sucursal) then raise exception 'sucursal_invalida'; end if;
     select coalesce(sum((i->>'cantidad')::int * (i->>'costo_unit')::int), 0) into v_total
       from jsonb_array_elements(p->'items') i;
     if jsonb_array_length(p->'items') = 0 then raise exception 'compra_vacia'; end if;
     if v_pago < 0 or v_pago > v_total then raise exception 'pago_invalido'; end if;

     insert into compras (sucursal_id, proveedor_id, fecha, vencimiento, total, nota, usuario_id)
     values (v_sucursal, (p->>'proveedor_id')::uuid, coalesce((p->>'fecha')::date, current_date), (p->>'vencimiento')::date,
             v_total, coalesce(p->>'nota', ''), (p->>'usuario_id')::uuid)
     returning id into v_id;

     for it in
       select pr.id, pr.nombre, (i->>'cantidad')::int as cantidad, (i->>'costo_unit')::int as costo_unit
         from jsonb_array_elements(p->'items') i
         join productos pr on pr.id = (i->>'producto_id')::uuid
     loop
       insert into compra_items (compra_id, producto_id, nombre, cantidad, costo_unit)
       values (v_id, it.id, it.nombre, it.cantidad, it.costo_unit);
       if coalesce((p->>'actualizar_costo')::boolean, true) then
         update productos set costo = it.costo_unit where id = it.id;
       end if;
       perform cambiar_stock(it.id, v_sucursal, it.cantidad, 'compra', 'Compra', v_id, (p->>'usuario_id')::uuid, it.costo_unit);
     end loop;

     if (select count(*) from compra_items where compra_id = v_id) <> jsonb_array_length(p->'items') then
       raise exception 'producto_invalido';
     end if;

     if v_pago > 0 then
       insert into caja (sucursal_id, fecha, tipo, cuenta, monto, categoria, descripcion, compra_id, proveedor_id, usuario_id)
       select sucursal_id, fecha, 'egreso', p->'pago'->>'cuenta', v_pago, 'pago_proveedor', 'Pago de la compra ' || numero,
              id, proveedor_id, usuario_id
         from compras where id = v_id;
     end if;
     return v_id;
   end
   $$`,

  // Anular una compra: saca del stock lo que había entrado y borra sus pagos de la caja.
  `create or replace function anular_compra(p_id uuid, p_usuario uuid)
   returns boolean language plpgsql as $$
   declare it record; v_sucursal uuid;
   begin
     update compras set estado = 'anulada' where id = p_id and estado = 'ok' returning sucursal_id into v_sucursal;
     if not found then return false; end if;
     for it in select producto_id, cantidad from compra_items where compra_id = p_id and producto_id is not null loop
       perform cambiar_stock(it.producto_id, v_sucursal, -it.cantidad, 'anulacion', 'Compra anulada', p_id, p_usuario);
     end loop;
     delete from caja where compra_id = p_id;
     return true;
   end
   $$`,

  // Cambio de stock suelto en un local: ingreso (suma) o ajuste por conteo (deja el stock en el número contado).
  'drop function if exists mover_stock(uuid, text, int, text, uuid)',
  `create or replace function mover_stock(p_producto uuid, p_sucursal uuid, p_tipo text, p_cantidad int, p_motivo text,
                                          p_usuario uuid)
   returns int language plpgsql as $$
   declare v_actual int; v_dif int;
   begin
     if not exists (select 1 from productos where id = p_producto) then raise exception 'producto_invalido'; end if;
     if not exists (select 1 from sucursales where id = p_sucursal) then raise exception 'sucursal_invalida'; end if;
     select cantidad into v_actual from existencias where producto_id = p_producto and sucursal_id = p_sucursal for update;
     v_actual := coalesce(v_actual, 0);
     v_dif := case when p_tipo = 'ajuste' then p_cantidad - v_actual else p_cantidad end;
     if v_dif = 0 then return v_actual; end if;
     return cambiar_stock(p_producto, p_sucursal, v_dif, p_tipo, p_motivo, null, p_usuario);
   end
   $$`,

  // Traspaso de mercadería de un local a otro: sale de uno y entra en el otro en el mismo paso.
  `create or replace function registrar_traspaso(p jsonb)
   returns uuid language plpgsql as $$
   declare
     v_id uuid;
     v_origen uuid := (p->>'origen_id')::uuid;
     v_destino uuid := (p->>'destino_id')::uuid;
     v_usuario uuid := (p->>'usuario_id')::uuid;
     v_numero bigint;
     it record;
   begin
     if v_origen = v_destino
        or (select count(*) from sucursales where id in (v_origen, v_destino) and activo) <> 2 then
       raise exception 'traspaso_invalido';
     end if;
     if jsonb_array_length(p->'items') = 0 then raise exception 'traspaso_vacio'; end if;
     insert into traspasos (fecha, origen_id, destino_id, nota, usuario_id)
     values (coalesce((p->>'fecha')::date, current_date), v_origen, v_destino, coalesce(p->>'nota', ''), v_usuario)
     returning id, numero into v_id, v_numero;

     for it in
       select pr.id, pr.nombre, sum((i->>'cantidad')::int)::int as cantidad
         from jsonb_array_elements(p->'items') i
         join productos pr on pr.id = (i->>'producto_id')::uuid
        group by pr.id, pr.nombre
     loop
       insert into traspaso_items (traspaso_id, producto_id, nombre, cantidad) values (v_id, it.id, it.nombre, it.cantidad);
       if cambiar_stock(it.id, v_origen, -it.cantidad, 'traspaso', 'Traspaso ' || v_numero || ' (sale)', v_id, v_usuario) < 0 then
         raise exception 'stock_insuficiente';
       end if;
       perform cambiar_stock(it.id, v_destino, it.cantidad, 'traspaso', 'Traspaso ' || v_numero || ' (entra)', v_id, v_usuario);
     end loop;

     if (select count(distinct (i->>'producto_id')) from jsonb_array_elements(p->'items') i)
        <> (select count(*) from traspaso_items where traspaso_id = v_id) then
       raise exception 'producto_invalido';
     end if;
     return v_id;
   end
   $$`,

  `create or replace function anular_traspaso(p_id uuid, p_usuario uuid)
   returns boolean language plpgsql as $$
   declare t traspasos%rowtype; it record;
   begin
     update traspasos set estado = 'anulado' where id = p_id and estado = 'ok' returning * into t;
     if not found then return false; end if;
     for it in select producto_id, cantidad from traspaso_items where traspaso_id = p_id and producto_id is not null loop
       perform cambiar_stock(it.producto_id, t.destino_id, -it.cantidad, 'traspaso', 'Traspaso ' || t.numero || ' anulado', p_id, p_usuario);
       perform cambiar_stock(it.producto_id, t.origen_id, it.cantidad, 'traspaso', 'Traspaso ' || t.numero || ' anulado', p_id, p_usuario);
     end loop;
     return true;
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
  [`${GASTOS_INICIALES} where not exists (select 1 from meta where key = 'seeded')`],
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
