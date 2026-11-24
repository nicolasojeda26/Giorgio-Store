// Todo lo que hace el sistema, como acciones { action, ...datos } que recibe /api/rpc.
// Cada acción declara quién la puede usar: 'todos', 'encargado' (encargados y dueño) o 'dueno'.
// Los encargados y vendedores trabajan siempre en su local; el dueño elige el local o ve todos.
import { resumenPeriodo } from '../../shared/finanzas.js'

export class ActionError extends Error {
  constructor(code, message, status = 400) {
    super(message)
    this.code = code
    this.status = status
  }
}
const fail = (code, message, status) => {
  throw new ActionError(code, message, status)
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const uuid = (value, what = 'dato') => (UUID.test(String(value ?? '')) ? value : fail('invalido', `Falta ${what}.`))
const optUuid = (value) => (value && UUID.test(String(value)) ? value : null)
const int = (value, { min = 0, max = 2_000_000_000, what = 'el número' } = {}) => {
  const n = Number(value)
  if (!Number.isInteger(n) || n < min || n > max) fail('invalido', `Revisá ${what}.`)
  return n
}
const text = (value, max = 200) =>
  String(value ?? '')
    .trim()
    .slice(0, max)
const required = (value, what, max = 200) => text(value, max) || fail('invalido', `Escribí ${what}.`)
const fecha = (value) => {
  if (!value) return null
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value))) fail('invalido', 'Revisá la fecha.')
  return value
}
const mes = (value) => {
  const m = String(value ?? '')
  if (/^\d{4}-\d{2}$/.test(m)) return m
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Argentina/Buenos_Aires' }).slice(0, 7)
}
const rangoMes = (m) => {
  const [y, mm] = m.split('-').map(Number)
  const next = mm === 12 ? `${y + 1}-01` : `${y}-${String(mm + 1).padStart(2, '0')}`
  return [`${m}-01`, `${next}-01`]
}
const CUENTAS = ['efectivo', 'banco', 'mercado_pago']
const cuenta = (value) => (CUENTAS.includes(value) ? value : fail('invalido', 'Elegí la cuenta.'))
const CATEGORIAS = {
  ingreso: ['aporte', 'otro_ingreso'],
  egreso: ['gasto_fijo', 'gasto_variable', 'pago_proveedor', 'retiro', 'otro_egreso'],
}

// Errores que levantan las funciones de la base (ver schema.js) y su mensaje para la pantalla.
const DB_ERRORS = {
  medio_invalido: 'Elegí el medio de pago.',
  venta_vacia: 'Agregá al menos un producto con precio.',
  descuento_invalido: 'El descuento no puede ser mayor que el total.',
  producto_invalido: 'Uno de los productos ya no existe. Actualizá la página.',
  compra_vacia: 'Agregá al menos un producto.',
  pago_invalido: 'Lo pagado no puede ser mayor que el total de la compra.',
  sucursal_invalida: 'Elegí el local.',
  traspaso_invalido: 'Elegí dos locales distintos.',
  traspaso_vacio: 'Agregá al menos un producto.',
  stock_insuficiente: 'No hay tanto stock en el local de origen.',
}
export const dbErrorMessage = (error) => {
  const key = Object.keys(DB_ERRORS).find((k) => String(error?.message ?? '').includes(k))
  return key ? new ActionError(key, DB_ERRORS[key]) : null
}

const esDueno = (usuario) => usuario.rol === 'dueno'
/** Local sobre el que se lee: el dueño elige (vacío = todos); los demás, siempre el suyo. */
const alcance = (body, usuario) => (esDueno(usuario) ? optUuid(body?.sucursalId) : usuario.sucursal_id)
/** Local en el que se opera (vender, ingresar, contar): tiene que ser uno concreto. */
const local = (body, usuario) => {
  if (esDueno(usuario)) return uuid(body?.sucursalId, 'el local')
  return usuario.sucursal_id ?? fail('sin_local', 'Tu usuario no tiene local. Pedile al dueño que te asigne uno.', 403)
}
/** Filtro "and <col> = $n" si hay un local elegido. Devuelve [sql, params]. */
const filtroLocal = (sucursal, col, params) =>
  sucursal ? [` and ${col} = $${params.length + 1}`, [...params, sucursal]] : ['', params]
const primerDiaMes = () => mes() + '-01'

const PRODUCTO =
  'p.id, p.codigo, p.nombre, p.categoria, p.presentacion, p.precio, p.stock_minimo, p.proveedor_id, p.activo'
/** Stock de cada producto por local ({ sucursalId: cantidad }) y en el local elegido (o la suma). */
const STOCKS = `coalesce((select json_object_agg(e.sucursal_id, e.cantidad) from existencias e where e.producto_id = p.id), '{}') as stocks`
const stockEn = (sucursal, params) =>
  sucursal
    ? [
        `coalesce((select cantidad from existencias where producto_id = p.id and sucursal_id = $${params.length + 1}), 0)`,
        [...params, sucursal],
      ]
    : ['coalesce((select sum(cantidad) from existencias where producto_id = p.id), 0)::int', params]

export const ACTIONS = {
  // ---------- Datos base que usan todas las pantallas ----------
  inicio: {
    rol: 'todos',
    async run(body, { sql, usuario }) {
      const dueno = esDueno(usuario)
      const sucursal = alcance(body, usuario)
      const [stockCol, stockParams] = stockEn(sucursal, [])
      const [hoyLocal, hoyParams] = filtroLocal(sucursal, 'sucursal_id', usuario.rol === 'vendedor' ? [usuario.id] : [])
      const [medios, ajustes, sucursales, bajo, hoy] = await Promise.all([
        sql.query(
          `select id, nombre, cuenta, ${dueno ? 'comision_pct, retencion_pct, aplica_iva,' : ''} activo
             from medios_pago order by orden, nombre`,
        ),
        sql.query('select negocio, sueldo_dueno, iva_comision, redondeo from ajustes where id = 1'),
        sql.query('select id, nombre, direccion, activo from sucursales order by orden, nombre'),
        // Stock bajo: en el local elegido, o en cualquiera de los dos (una fila por local).
        sucursal
          ? sql.query(
              `select * from (select p.id, p.nombre, p.presentacion, ${stockCol} as stock, p.stock_minimo, $1::uuid as sucursal_id
                 from productos p where p.activo) x
                where stock <= stock_minimo and (stock_minimo > 0 or stock < 0) order by stock - stock_minimo, nombre limit 50`,
              stockParams,
            )
          : sql.query(
              `select p.id, p.nombre, p.presentacion, coalesce(e.cantidad, 0) as stock, p.stock_minimo, s.id as sucursal_id
                 from productos p cross join sucursales s
                 left join existencias e on e.producto_id = p.id and e.sucursal_id = s.id
                where p.activo and s.activo and coalesce(e.cantidad, 0) <= p.stock_minimo
                  and (p.stock_minimo > 0 or coalesce(e.cantidad, 0) < 0)
                order by coalesce(e.cantidad, 0) - p.stock_minimo, p.nombre limit 50`,
            ),
        sql.query(
          `select count(*)::int as ventas, coalesce(sum(total), 0)::int as total from ventas
            where estado = 'ok' and fecha = (now() at time zone 'America/Argentina/Buenos_Aires')::date
            ${usuario.rol === 'vendedor' ? 'and usuario_id = $1' : ''}${hoyLocal}`,
          hoyParams,
        ),
      ])
      const miLocal = sucursales.find((x) => x.id === usuario.sucursal_id)
      return {
        usuario: {
          id: usuario.id,
          nombre: usuario.nombre,
          email: usuario.email,
          rol: usuario.rol,
          sucursal_id: usuario.sucursal_id,
          sucursal: miLocal?.nombre ?? null,
        },
        medios,
        sucursales,
        ajustes: dueno ? ajustes[0] : { negocio: ajustes[0].negocio },
        stockBajo: bajo,
        hoy: hoy[0],
      }
    },
  },

  // ---------- Productos y stock ----------
  productos: {
    rol: 'todos',
    async run(body, { sql, usuario }) {
      // Solo el dueño ve costos. Todos ven el stock de los dos locales ("¿hay en el otro local?").
      const [stockCol, params] = stockEn(alcance(body, usuario), [])
      const columnas = `${PRODUCTO}, ${stockCol} as stock, ${STOCKS}${esDueno(usuario) ? ', p.costo' : ''}`
      const [productos, proveedores] = await Promise.all([
        sql.query(`select ${columnas} from productos p order by p.activo desc, lower(p.nombre)`, params),
        esDueno(usuario)
          ? sql.query('select id, nombre, telefono, notas, activo from proveedores order by lower(nombre)')
          : [],
      ])
      return { productos, proveedores }
    },
  },
  guardarProducto: {
    rol: 'dueno',
    async run({ producto: p }, { sql, usuario }) {
      const row = {
        codigo: text(p?.codigo, 40) || null,
        nombre: required(p?.nombre, 'el nombre', 120),
        categoria: text(p?.categoria, 60),
        presentacion: text(p?.presentacion, 40),
        costo: int(p?.costo ?? 0, { what: 'el costo' }),
        precio: int(p?.precio ?? 0, { what: 'el precio' }),
        stock_minimo: int(p?.stock_minimo ?? 0, { max: 100000, what: 'el stock mínimo' }),
        proveedor_id: optUuid(p?.proveedor_id),
        activo: p?.activo !== false,
      }
      const keys = Object.keys(row)
      if (p?.id) {
        const [saved] = await sql.query(
          `update productos set ${keys.map((k, i) => `${k} = $${i + 2}`).join(', ')} where id = $1 returning id`,
          [uuid(p.id), ...Object.values(row)],
        )
        return saved ?? fail('no_existe', 'Ese producto ya no existe.', 404)
      }
      // Stock inicial: { sucursalId: cantidad } para cargar los dos locales de una vez.
      const iniciales = Object.entries(p?.stocks && typeof p.stocks === 'object' ? p.stocks : {})
        .map(([suc, n]) => [uuid(suc, 'el local'), int(n || 0, { max: 100000, what: 'el stock inicial' })])
        .filter(([, n]) => n > 0)
      const [saved] = await sql.query(
        `insert into productos (${keys.join(', ')}) values (${keys.map((_, i) => `$${i + 1}`).join(', ')}) returning id`,
        Object.values(row),
      )
      for (const [suc, n] of iniciales) {
        await sql.query("select mover_stock($1, $2, 'ingreso', $3, 'Stock inicial', $4)", [
          saved.id,
          suc,
          n,
          usuario.id,
        ])
      }
      return saved
    },
  },
  /** Ingreso de mercadería (cualquiera, en su local) o ajuste por conteo (encargado o dueño). */
  moverStock: {
    rol: 'todos',
    async run(body, { sql, usuario }) {
      const { productoId, tipo, cantidad, motivo } = body
      if (!['ingreso', 'ajuste'].includes(tipo)) fail('invalido', 'Movimiento desconocido.')
      if (tipo === 'ajuste' && usuario.rol === 'vendedor') {
        fail('sin_permiso', 'Solo el encargado o el dueño corrigen el stock.', 403)
      }
      const n =
        tipo === 'ingreso'
          ? int(cantidad, { min: 1, max: 100000, what: 'la cantidad' })
          : int(cantidad, { min: 0, max: 100000, what: 'el stock contado' })
      const [{ mover_stock: stock }] = await sql.query('select mover_stock($1, $2, $3, $4, $5, $6)', [
        uuid(productoId, 'el producto'),
        local(body, usuario),
        tipo,
        n,
        text(motivo, 120) || (tipo === 'ajuste' ? 'Ajuste por conteo' : 'Ingreso de mercadería'),
        usuario.id,
      ])
      return { stock }
    },
  },
  movimientos: {
    rol: 'encargado',
    async run(body, { sql, usuario }) {
      const [filtro, params] = filtroLocal(alcance(body, usuario), 'm.sucursal_id', [
        uuid(body.productoId, 'el producto'),
      ])
      return sql.query(
        `select m.id, m.tipo, m.cantidad, m.stock_final, ${esDueno(usuario) ? 'm.costo_unit,' : ''} m.motivo, m.created_at,
                u.nombre as usuario, s.nombre as sucursal
           from movimientos_stock m left join usuarios u on u.id = m.usuario_id join sucursales s on s.id = m.sucursal_id
          where m.producto_id = $1${filtro} order by m.created_at desc, m.id desc limit 200`,
        params,
      )
    },
  },

  // ---------- Traspasos entre locales ----------
  traspasos: {
    rol: 'encargado',
    async run(body, { sql, usuario }) {
      const sucursal = alcance(body, usuario)
      return sql.query(
        `select t.id, t.numero, t.fecha, t.nota, t.estado, t.origen_id, t.destino_id, o.nombre as origen, d.nombre as destino,
                u.nombre as usuario,
                (select json_agg(json_build_object('nombre', i.nombre, 'cantidad', i.cantidad) order by i.id)
                   from traspaso_items i where i.traspaso_id = t.id) as items
           from traspasos t join sucursales o on o.id = t.origen_id join sucursales d on d.id = t.destino_id
           left join usuarios u on u.id = t.usuario_id
          ${sucursal ? 'where $1 in (t.origen_id, t.destino_id)' : ''}
          order by t.fecha desc, t.numero desc limit 200`,
        sucursal ? [sucursal] : [],
      )
    },
  },
  registrarTraspaso: {
    rol: 'encargado',
    async run({ traspaso: t }, { sql, usuario }) {
      const items = Array.isArray(t?.items) ? t.items : []
      if (!items.length || items.length > 200) fail('traspaso_vacio', 'Agregá al menos un producto.')
      // El encargado manda mercadería desde su local.
      const origen = esDueno(usuario) ? uuid(t.origenId, 'el local de origen') : local({}, usuario)
      const payload = {
        origen_id: origen,
        destino_id: uuid(t.destinoId, 'el local de destino'),
        fecha: fecha(t.fecha),
        nota: text(t.nota, 200),
        usuario_id: usuario.id,
        items: items.map((i) => ({
          producto_id: uuid(i.productoId, 'el producto'),
          cantidad: int(i.cantidad, { min: 1, max: 100000, what: 'la cantidad' }),
        })),
      }
      const [{ registrar_traspaso: id }] = await sql.query('select registrar_traspaso($1::jsonb)', [
        JSON.stringify(payload),
      ])
      const [row] = await sql.query('select id, numero from traspasos where id = $1', [id])
      return row
    },
  },
  anularTraspaso: {
    rol: 'dueno',
    async run({ id }, { sql, usuario }) {
      const [{ anular_traspaso: ok }] = await sql.query('select anular_traspaso($1, $2)', [uuid(id), usuario.id])
      return ok ? { ok } : fail('no_existe', 'Ese traspaso ya estaba anulado.')
    },
  },

  // ---------- Ventas ----------
  registrarVenta: {
    rol: 'todos',
    async run({ venta: v }, { sql, usuario }) {
      const items = Array.isArray(v?.items) ? v.items : []
      if (!items.length || items.length > 100) fail('venta_vacia', 'Agregá al menos un producto.')
      const payload = {
        sucursal_id: local(v, usuario),
        fecha: fecha(v.fecha),
        cliente: text(v.cliente, 80),
        nota: text(v.nota, 200),
        medio_pago_id: uuid(v.medioPagoId, 'el medio de pago'),
        descuento: int(v.descuento ?? 0, { what: 'el descuento' }),
        usuario_id: usuario.id,
        items: items.map((i) => ({
          producto_id: uuid(i.productoId, 'el producto'),
          cantidad: int(i.cantidad, { min: 1, max: 10000, what: 'la cantidad' }),
          precio_unit: int(i.precio, { what: 'el precio' }),
        })),
      }
      const [{ registrar_venta: id }] = await sql.query('select registrar_venta($1::jsonb)', [JSON.stringify(payload)])
      const [venta] = await sql.query('select id, numero, total from ventas where id = $1', [id])
      return venta
    },
  },
  ventas: {
    rol: 'todos',
    async run(body, { sql, usuario }) {
      const [desde, hasta] = rangoMes(mes(body.mes))
      const dueno = esDueno(usuario)
      // El vendedor ve las suyas; el encargado, las de su local; el dueño, todas o las del local elegido.
      let [filtro, params] = filtroLocal(alcance(body, usuario), 'v.sucursal_id', [desde, hasta])
      if (usuario.rol === 'vendedor') {
        filtro += ` and v.usuario_id = $${params.length + 1}`
        params = [...params, usuario.id]
      }
      return sql.query(
        `select v.id, v.numero, v.fecha, v.cliente, v.medio_nombre, v.subtotal, v.descuento, v.total,
                ${dueno ? 'v.costo, v.comision,' : ''} v.estado, v.nota, v.created_at, u.nombre as usuario,
                v.sucursal_id, s.nombre as sucursal,
                (select json_agg(json_build_object('nombre', i.nombre, 'cantidad', i.cantidad, 'precio', i.precio_unit) order by i.id)
                   from venta_items i where i.venta_id = v.id) as items
           from ventas v left join usuarios u on u.id = v.usuario_id join sucursales s on s.id = v.sucursal_id
          where v.fecha >= $1 and v.fecha < $2${filtro}
          order by v.fecha desc, v.numero desc`,
        params,
      )
    },
  },
  anularVenta: {
    rol: 'encargado',
    async run({ id }, { sql, usuario }) {
      if (!esDueno(usuario)) {
        const [v] = await sql.query('select sucursal_id from ventas where id = $1', [uuid(id)])
        if (v?.sucursal_id !== usuario.sucursal_id) fail('sin_permiso', 'Esa venta es de otro local.', 403)
      }
      const [{ anular_venta: ok }] = await sql.query('select anular_venta($1, $2)', [uuid(id), usuario.id])
      return ok ? { ok } : fail('no_existe', 'Esa venta ya estaba anulada.')
    },
  },

  // ---------- Proveedores, compras y deudas (solo el dueño) ----------
  guardarProveedor: {
    rol: 'dueno',
    async run({ proveedor: p }, { sql }) {
      const values = [
        required(p?.nombre, 'el nombre', 80),
        text(p?.telefono, 40),
        text(p?.notas, 300),
        p?.activo !== false,
      ]
      if (p?.id) {
        const [row] = await sql.query(
          'update proveedores set nombre = $2, telefono = $3, notas = $4, activo = $5 where id = $1 returning id',
          [uuid(p.id), ...values],
        )
        return row ?? fail('no_existe', 'Ese proveedor ya no existe.', 404)
      }
      const [row] = await sql.query(
        'insert into proveedores (nombre, telefono, notas, activo) values ($1, $2, $3, $4) returning id',
        values,
      )
      return row
    },
  },
  registrarCompra: {
    rol: 'dueno',
    async run({ compra: c }, { sql, usuario }) {
      const items = Array.isArray(c?.items) ? c.items : []
      if (!items.length || items.length > 200) fail('compra_vacia', 'Agregá al menos un producto.')
      const pago = int(c.pago ?? 0, { what: 'lo pagado' })
      const payload = {
        sucursal_id: uuid(c.sucursalId, 'el local al que llega'),
        proveedor_id: optUuid(c.proveedorId),
        fecha: fecha(c.fecha),
        vencimiento: fecha(c.vencimiento),
        nota: text(c.nota, 200),
        actualizar_costo: c.actualizarCosto !== false,
        usuario_id: usuario.id,
        pago: pago > 0 ? { monto: pago, cuenta: cuenta(c.cuenta) } : null,
        items: items.map((i) => ({
          producto_id: uuid(i.productoId, 'el producto'),
          cantidad: int(i.cantidad, { min: 1, max: 100000, what: 'la cantidad' }),
          costo_unit: int(i.costo, { what: 'el costo' }),
        })),
      }
      const [{ registrar_compra: id }] = await sql.query('select registrar_compra($1::jsonb)', [
        JSON.stringify(payload),
      ])
      const [compra] = await sql.query('select id, numero, total from compras where id = $1', [id])
      return compra
    },
  },
  compras: {
    rol: 'dueno',
    async run(body, { sql, usuario }) {
      const [filtro, params] = filtroLocal(alcance(body, usuario), 'c.sucursal_id', [])
      return sql.query(
        `select c.id, c.numero, c.fecha, c.vencimiento, c.total, c.nota, c.estado, c.proveedor_id, p.nombre as proveedor,
                c.sucursal_id, s.nombre as sucursal,
                coalesce((select sum(monto) from caja where compra_id = c.id), 0)::int as pagado,
                (select json_agg(json_build_object('nombre', i.nombre, 'cantidad', i.cantidad, 'costo', i.costo_unit) order by i.id)
                   from compra_items i where i.compra_id = c.id) as items
           from compras c left join proveedores p on p.id = c.proveedor_id join sucursales s on s.id = c.sucursal_id
          where true${filtro}
          order by c.fecha desc, c.numero desc limit 300`,
        params,
      )
    },
  },
  pagarCompra: {
    rol: 'dueno',
    async run({ compraId, monto, cuenta: cta, fecha: f, sucursalId }, { sql, usuario }) {
      const [compra] = await sql.query(
        `select c.id, c.numero, c.proveedor_id, c.sucursal_id,
                c.total - coalesce((select sum(monto) from caja where compra_id = c.id), 0) as saldo
           from compras c where c.id = $1 and c.estado = 'ok'`,
        [uuid(compraId, 'la compra')],
      )
      if (!compra) fail('no_existe', 'Esa compra no existe.', 404)
      const pago = int(monto, { min: 1, what: 'el monto' })
      if (pago > Number(compra.saldo)) fail('invalido', 'El pago es mayor que lo que se debe.')
      // Sale de la caja del local que se elija (por defecto, el local al que llegó la compra).
      await sql.query(
        `insert into caja (sucursal_id, fecha, tipo, cuenta, monto, categoria, descripcion, compra_id, proveedor_id, usuario_id)
         values ($1, coalesce($2::date, current_date), 'egreso', $3, $4, 'pago_proveedor', $5, $6, $7, $8)`,
        [
          optUuid(sucursalId) ?? compra.sucursal_id,
          fecha(f),
          cuenta(cta),
          pago,
          `Pago de la compra ${compra.numero}`,
          compra.id,
          compra.proveedor_id,
          usuario.id,
        ],
      )
      return { ok: true }
    },
  },
  anularCompra: {
    rol: 'dueno',
    async run({ id }, { sql, usuario }) {
      const [{ anular_compra: ok }] = await sql.query('select anular_compra($1, $2)', [uuid(id), usuario.id])
      return ok ? { ok } : fail('no_existe', 'Esa compra ya estaba anulada.')
    },
  },

  // ---------- Caja (el encargado ve y carga la de su local) ----------
  caja: {
    rol: 'encargado',
    async run(body, { sql, usuario }) {
      const sucursal = alcance(body, usuario)
      const [desde, hasta] = rangoMes(mes(body.mes))
      const [filtro, params] = filtroLocal(sucursal, 'c.sucursal_id', [desde, hasta])
      const [filtroSaldo, paramsSaldo] = filtroLocal(sucursal, 'sucursal_id', [])
      const [movimientos, saldos] = await Promise.all([
        sql.query(
          `select c.id, c.fecha, c.tipo, c.cuenta, c.monto, c.categoria, c.descripcion, c.venta_id, c.compra_id,
                  c.gasto_fijo_id, p.nombre as proveedor, g.nombre as gasto_fijo, u.nombre as usuario,
                  c.sucursal_id, s.nombre as sucursal
             from caja c
             join sucursales s on s.id = c.sucursal_id
             left join proveedores p on p.id = c.proveedor_id
             left join gastos_fijos g on g.id = c.gasto_fijo_id
             left join usuarios u on u.id = c.usuario_id
            where c.fecha >= $1 and c.fecha < $2${filtro}
            order by c.fecha desc, c.created_at desc`,
          params,
        ),
        sql.query(
          `select cuenta, coalesce(sum(case when tipo = 'ingreso' then monto else -monto end), 0)::int as saldo
             from caja where true${filtroSaldo} group by cuenta`,
          paramsSaldo,
        ),
      ])
      return {
        movimientos,
        saldos: Object.fromEntries(CUENTAS.map((c) => [c, saldos.find((s) => s.cuenta === c)?.saldo ?? 0])),
      }
    },
  },
  registrarMovimiento: {
    rol: 'encargado',
    async run({ movimiento: m }, { sql, usuario }) {
      const tipo = ['ingreso', 'egreso'].includes(m?.tipo) ? m.tipo : fail('invalido', 'Elegí si entra o sale plata.')
      const categoria = CATEGORIAS[tipo].includes(m.categoria) ? m.categoria : fail('invalido', 'Elegí la categoría.')
      if (categoria === 'pago_proveedor') fail('invalido', 'Los pagos a proveedores se cargan desde Compras.')
      if (!esDueno(usuario) && ['aporte', 'retiro'].includes(categoria)) {
        fail('sin_permiso', 'Los aportes y retiros los carga el dueño.', 403)
      }
      const sucursal = local(m, usuario)
      let gastoFijo = null
      if (categoria === 'gasto_fijo') {
        gastoFijo = uuid(m.gastoFijoId, 'el gasto fijo')
        // El encargado solo paga gastos de su local.
        const [g] = await sql.query('select sucursal_id from gastos_fijos where id = $1', [gastoFijo])
        if (!g) fail('no_existe', 'Ese gasto ya no existe.', 404)
        if (!esDueno(usuario) && g.sucursal_id !== sucursal) fail('sin_permiso', 'Ese gasto no es de tu local.', 403)
      }
      const [row] = await sql.query(
        `insert into caja (sucursal_id, fecha, tipo, cuenta, monto, categoria, descripcion, gasto_fijo_id, usuario_id)
         values ($1, coalesce($2::date, current_date), $3, $4, $5, $6, $7, $8, $9) returning id`,
        [
          sucursal,
          fecha(m.fecha),
          tipo,
          cuenta(m.cuenta),
          int(m.monto, { min: 1, what: 'el monto' }),
          categoria,
          text(m.descripcion, 200),
          gastoFijo,
          usuario.id,
        ],
      )
      return row
    },
  },
  borrarMovimiento: {
    rol: 'encargado',
    async run({ id }, { sql, usuario }) {
      // Los cobros de ventas y los pagos de compras se deshacen anulando la venta o la compra.
      // El encargado solo borra movimientos de su local que no sean aportes ni retiros.
      const [row] = await sql.query(
        `delete from caja where id = $1 and venta_id is null and compra_id is null
            and ($2::uuid is null or (sucursal_id = $2 and categoria not in ('aporte', 'retiro'))) returning id`,
        [uuid(id), esDueno(usuario) ? null : usuario.sucursal_id],
      )
      return row ?? fail('no_se_puede', 'Ese movimiento no se puede borrar desde acá.')
    },
  },

  // ---------- Gastos fijos: generales del negocio o de cada local ----------
  gastosFijos: {
    rol: 'encargado',
    async run(_, { sql, usuario }) {
      // Se marca si ya se pagó este mes (hay un pago en la caja con ese gasto).
      const params = esDueno(usuario) ? [primerDiaMes()] : [primerDiaMes(), usuario.sucursal_id]
      return sql.query(
        `select g.id, g.nombre, g.monto, g.dia_pago, g.activo, g.orden, g.sucursal_id, s.nombre as sucursal,
                coalesce((select sum(monto) from caja c where c.gasto_fijo_id = g.id and c.fecha >= $1::date
                           and c.fecha < ($1::date + interval '1 month')), 0)::int as pagado_mes
           from gastos_fijos g left join sucursales s on s.id = g.sucursal_id
          ${esDueno(usuario) ? '' : 'where g.sucursal_id = $2'}
          order by s.orden nulls first, g.orden, g.nombre`,
        params,
      )
    },
  },
  guardarGastoFijo: {
    rol: 'dueno',
    async run({ gasto: g }, { sql }) {
      const values = [
        required(g?.nombre, 'el nombre', 80),
        int(g?.monto ?? 0, { what: 'el monto' }),
        g?.dia_pago ? int(g.dia_pago, { min: 1, max: 31, what: 'el día de pago' }) : null,
        g?.activo !== false,
        optUuid(g?.sucursal_id),
      ]
      if (g?.id) {
        const [row] = await sql.query(
          `update gastos_fijos set nombre = $2, monto = $3, dia_pago = $4, activo = $5, sucursal_id = $6
            where id = $1 returning id`,
          [uuid(g.id), ...values],
        )
        return row ?? fail('no_existe', 'Ese gasto ya no existe.', 404)
      }
      const [row] = await sql.query(
        `insert into gastos_fijos (nombre, monto, dia_pago, activo, sucursal_id, orden)
         values ($1, $2, $3, $4, $5, (select coalesce(max(orden) + 1, 0) from gastos_fijos)) returning id`,
        values,
      )
      return row
    },
  },
  borrarGastoFijo: {
    rol: 'dueno',
    async run({ id }, { sql }) {
      const [row] = await sql.query('delete from gastos_fijos where id = $1 returning id', [uuid(id)])
      return row ?? fail('no_existe', 'Ese gasto ya no existe.', 404)
    },
  },

  // ---------- Finanzas ----------
  /**
   * Resultado del mes (lo que se ganó) separado de la caja (la plata que se movió):
   *   contribución = ventas − costo de la mercadería vendida − comisiones
   *   Por local:  resultado del local = contribución − gastos fijos del local − gastos variables del local
   *   Total:      resultado = contribución de los dos − todos los gastos fijos − sueldo del dueño − gastos variables
   * Los gastos generales (sin local) y el sueldo del dueño solo entran en el total.
   * Las compras de mercadería no son gasto: se vuelven costo cuando el producto se vende.
   */
  finanzas: {
    rol: 'dueno',
    async run(body, { sql, usuario }) {
      const periodo = mes(body.mes)
      const sucursal = alcance(body, usuario)
      const [desde, hasta] = rangoMes(periodo)
      const [fv, pv] = filtroLocal(sucursal, 'v.sucursal_id', [desde, hasta])
      const [fc, pc] = filtroLocal(sucursal, 'sucursal_id', [desde, hasta])
      const [fg, pg] = sucursal ? [' and sucursal_id = $1', [sucursal]] : ['', []]
      const [stockCol, ps] = sucursal ? ['coalesce(e.cantidad, 0)', [sucursal]] : ['coalesce(e.cantidad, 0)', []]
      const [[totales], [fijos], [ajustes], [variables], productos, deudas, [stock], dias, porLocal] =
        await Promise.all([
          sql.query(
            `select coalesce(sum(v.total), 0)::int as ventas, coalesce(sum(v.costo), 0)::int as costo,
                  coalesce(sum(v.comision), 0)::int as comision, count(*)::int as cantidad,
                  coalesce(sum((select sum(i.cantidad) from venta_items i where i.venta_id = v.id)), 0)::int as unidades
             from ventas v where v.estado = 'ok' and v.fecha >= $1 and v.fecha < $2${fv}`,
            pv,
          ),
          sql.query(
            `select coalesce(sum(monto), 0)::int as total,
                  coalesce(sum(monto) filter (where sucursal_id is null), 0)::int as generales
             from gastos_fijos where activo${fg}`,
            pg,
          ),
          sql.query('select sueldo_dueno from ajustes where id = 1'),
          sql.query(
            `select coalesce(sum(monto) filter (where categoria = 'gasto_variable'), 0)::int as variables,
                  coalesce(sum(monto) filter (where categoria = 'otro_egreso'), 0)::int as otros
             from caja where tipo = 'egreso' and fecha >= $1 and fecha < $2${fc}`,
            pc,
          ),
          // Rentabilidad por producto: el descuento y la comisión de cada venta se reparten entre sus productos.
          sql.query(
            `select coalesce(i.producto_id::text, i.nombre) as id, max(i.nombre) as nombre, sum(i.cantidad)::int as unidades,
                  round(sum(i.cantidad * i.precio_unit * v.total::numeric / v.subtotal))::int as ventas,
                  sum(i.cantidad * i.costo_unit)::int as costo,
                  round(sum(i.cantidad * i.precio_unit * v.comision::numeric / v.subtotal))::int as comision
             from venta_items i join ventas v on v.id = i.venta_id
            where v.estado = 'ok' and v.fecha >= $1 and v.fecha < $2${fv}
            group by 1 order by 4 desc`,
            pv,
          ),
          sql.query(
            `select c.id, c.numero, c.fecha, c.vencimiento, p.nombre as proveedor, s.nombre as sucursal,
                  (c.total - coalesce((select sum(monto) from caja where compra_id = c.id), 0))::int as saldo
             from compras c left join proveedores p on p.id = c.proveedor_id join sucursales s on s.id = c.sucursal_id
            where c.estado = 'ok' and c.total > coalesce((select sum(monto) from caja where compra_id = c.id), 0)
              ${sucursal ? 'and c.sucursal_id = $1' : ''}
            order by c.vencimiento nulls last, c.fecha`,
            sucursal ? [sucursal] : [],
          ),
          sql.query(
            `select coalesce(sum(${stockCol} * p.costo) filter (where ${stockCol} > 0), 0)::bigint as costo,
                  coalesce(sum(${stockCol} * p.precio) filter (where ${stockCol} > 0), 0)::bigint as venta,
                  coalesce(sum(${stockCol}) filter (where ${stockCol} > 0), 0)::int as unidades
             from productos p join existencias e on e.producto_id = p.id
            where p.activo${sucursal ? ' and e.sucursal_id = $1' : ''}`,
            ps,
          ),
          sql.query(
            `select v.fecha, sum(v.total)::int as total, count(*)::int as ventas from ventas v
            where v.estado = 'ok' and v.fecha >= $1 and v.fecha < $2${fv} group by v.fecha order by v.fecha`,
            pv,
          ),
          // Comparación entre locales (siempre los dos), con el resultado de cada uno antes de los gastos generales.
          sql.query(
            `select s.id, s.nombre,
                  coalesce(v.ventas, 0)::int as ventas, coalesce(v.costo, 0)::int as costo, coalesce(v.comision, 0)::int as comision,
                  coalesce(v.cantidad, 0)::int as cantidad,
                  coalesce((select sum(monto) from gastos_fijos g where g.activo and g.sucursal_id = s.id), 0)::int as fijos,
                  coalesce((select sum(monto) from caja c where c.sucursal_id = s.id and c.tipo = 'egreso'
                             and c.categoria in ('gasto_variable', 'otro_egreso') and c.fecha >= $1 and c.fecha < $2), 0)::int as variables
             from sucursales s
             left join (select sucursal_id, sum(total) as ventas, sum(costo) as costo, sum(comision) as comision, count(*) as cantidad
                          from ventas where estado = 'ok' and fecha >= $1 and fecha < $2 group by sucursal_id) v
               on v.sucursal_id = s.id
            where s.activo or v.ventas is not null
            order by s.orden, s.nombre`,
            [desde, hasta],
          ),
        ])
      // En un local: sus gastos fijos, sin sueldo del dueño ni gastos generales. En el total: todo.
      const fijosMes = sucursal ? fijos.total : fijos.total + ajustes.sueldo_dueno
      return {
        mes: periodo,
        sucursalId: sucursal,
        cantidadVentas: totales.cantidad,
        unidades: totales.unidades,
        gastosFijos: fijos.total,
        gastosGenerales: sucursal ? 0 : fijos.generales,
        sueldoDueno: sucursal ? 0 : ajustes.sueldo_dueno,
        gastosVariables: variables.variables,
        otrosEgresos: variables.otros,
        resumen: resumenPeriodo({
          ventas: totales.ventas,
          costoMercaderia: totales.costo,
          comisiones: totales.comision,
          unidades: totales.unidades,
          fijos: fijosMes,
          otrosEgresos: variables.variables + variables.otros,
        }),
        porLocal: porLocal.map((l) => {
          const contribucion = l.ventas - l.costo - l.comision
          return { ...l, contribucion, resultado: contribucion - l.fijos - l.variables }
        }),
        productos: productos.map((p) => ({ ...p, ganancia: p.ventas - p.costo - p.comision })),
        deudas,
        stock: { costo: Number(stock.costo), venta: Number(stock.venta), unidades: stock.unidades },
        dias,
      }
    },
  },

  // ---------- Ajustes, locales, medios de pago ----------
  guardarAjustes: {
    rol: 'dueno',
    async run({ ajustes: a }, { sql }) {
      await sql.query(
        'update ajustes set negocio = $1, sueldo_dueno = $2, iva_comision = $3, redondeo = $4 where id = 1',
        [
          required(a?.negocio, 'el nombre del negocio', 80),
          int(a?.sueldo_dueno ?? 0, { what: 'el sueldo' }),
          Math.min(Math.max(Number(a?.iva_comision ?? 21) || 0, 0), 50),
          int(a?.redondeo ?? 100, { max: 100000, what: 'el redondeo' }),
        ],
      )
      return { ok: true }
    },
  },
  guardarSucursal: {
    rol: 'dueno',
    async run({ sucursal: s }, { sql }) {
      const values = [required(s?.nombre, 'el nombre del local', 40), text(s?.direccion, 120), s?.activo !== false]
      if (s?.id) {
        if (s.activo === false) {
          const [{ n }] = await sql.query('select count(*)::int as n from sucursales where activo and id <> $1', [
            uuid(s.id),
          ])
          if (n === 0) fail('invalido', 'Tiene que quedar al menos un local activo.')
        }
        const [row] = await sql.query(
          'update sucursales set nombre = $2, direccion = $3, activo = $4 where id = $1 returning id',
          [uuid(s.id), ...values],
        )
        return row ?? fail('no_existe', 'Ese local ya no existe.', 404)
      }
      const [row] = await sql.query(
        `insert into sucursales (nombre, direccion, activo, orden)
         values ($1, $2, $3, (select coalesce(max(orden) + 1, 0) from sucursales)) returning id`,
        values,
      )
      return row
    },
  },
  guardarMedio: {
    rol: 'dueno',
    async run({ medio: m }, { sql }) {
      const porcentaje = (v, what) => {
        const n = Number(v ?? 0)
        if (!Number.isFinite(n) || n < 0 || n >= 100) fail('invalido', `Revisá ${what}.`)
        return Math.round(n * 1000) / 1000
      }
      const values = [
        required(m?.nombre, 'el nombre', 60),
        cuenta(m?.cuenta),
        porcentaje(m?.comision_pct, 'la comisión'),
        porcentaje(m?.retencion_pct, 'las retenciones'),
        Boolean(m?.aplica_iva),
        m?.activo !== false,
      ]
      if (m?.id) {
        const [row] = await sql.query(
          `update medios_pago set nombre = $2, cuenta = $3, comision_pct = $4, retencion_pct = $5, aplica_iva = $6, activo = $7
            where id = $1 returning id`,
          [uuid(m.id), ...values],
        )
        return row ?? fail('no_existe', 'Ese medio de pago ya no existe.', 404)
      }
      const [row] = await sql.query(
        `insert into medios_pago (nombre, cuenta, comision_pct, retencion_pct, aplica_iva, activo, orden)
         values ($1, $2, $3, $4, $5, $6, (select coalesce(max(orden) + 1, 0) from medios_pago)) returning id`,
        values,
      )
      return row
    },
  },
}
