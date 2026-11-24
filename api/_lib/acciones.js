// Todo lo que hace el sistema, como acciones { action, ...datos } que recibe /api/rpc.
// Cada acción declara quién la puede usar: 'todos' (dueño y empleados) o 'dueno'.
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
}
export const dbErrorMessage = (error) => {
  const key = Object.keys(DB_ERRORS).find((k) => String(error?.message ?? '').includes(k))
  return key ? new ActionError(key, DB_ERRORS[key]) : null
}

const PRODUCTO = 'id, codigo, nombre, categoria, presentacion, precio, stock, stock_minimo, proveedor_id, activo'

export const ACTIONS = {
  // ---------- Datos base que usan todas las pantallas ----------
  inicio: {
    rol: 'todos',
    async run(_, { sql, usuario }) {
      const dueno = usuario.rol === 'dueno'
      const [medios, ajustes, bajo, hoy] = await Promise.all([
        sql.query(
          `select id, nombre, cuenta, ${dueno ? 'comision_pct, retencion_pct, aplica_iva,' : ''} activo
             from medios_pago order by orden, nombre`,
        ),
        sql.query('select negocio, sueldo_dueno, iva_comision, redondeo from ajustes where id = 1'),
        sql.query(
          `select id, nombre, presentacion, stock, stock_minimo from productos
            where activo and stock <= stock_minimo order by stock - stock_minimo, nombre limit 50`,
        ),
        sql.query(
          `select count(*)::int as ventas, coalesce(sum(total), 0)::int as total from ventas
            where estado = 'ok' and fecha = (now() at time zone 'America/Argentina/Buenos_Aires')::date
            ${dueno ? '' : 'and usuario_id = $1'}`,
          dueno ? [] : [usuario.id],
        ),
      ])
      return {
        usuario: { id: usuario.id, nombre: usuario.nombre, email: usuario.email, rol: usuario.rol },
        medios,
        ajustes: dueno ? ajustes[0] : { negocio: ajustes[0].negocio },
        stockBajo: bajo,
        hoy: hoy[0],
      }
    },
  },

  // ---------- Productos y stock ----------
  productos: {
    rol: 'todos',
    async run(_, { sql, usuario }) {
      // Los empleados no ven costos.
      const columnas = usuario.rol === 'dueno' ? `${PRODUCTO}, costo` : PRODUCTO
      const [productos, proveedores] = await Promise.all([
        sql.query(`select ${columnas} from productos order by activo desc, lower(nombre)`),
        usuario.rol === 'dueno'
          ? sql.query('select id, nombre, telefono, notas, activo from proveedores order by lower(nombre)')
          : [],
      ])
      return { productos, proveedores }
    },
  },
  guardarProducto: {
    rol: 'dueno',
    async run({ producto: p }, { sql }) {
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
      const stockInicial = int(p?.stock ?? 0, { max: 100000, what: 'el stock inicial' })
      const [saved] = await sql.query(
        `insert into productos (${keys.join(', ')}) values (${keys.map((_, i) => `$${i + 1}`).join(', ')}) returning id`,
        Object.values(row),
      )
      if (stockInicial > 0) {
        await sql.query("select mover_stock($1, 'ingreso', $2, 'Stock inicial', $3)", [saved.id, stockInicial, null])
      }
      return saved
    },
  },
  /** Ingreso de mercadería sin montos (lo puede hacer un empleado) o ajuste por conteo (solo el dueño). */
  moverStock: {
    rol: 'todos',
    async run({ productoId, tipo, cantidad, motivo }, { sql, usuario }) {
      if (!['ingreso', 'ajuste'].includes(tipo)) fail('invalido', 'Movimiento desconocido.')
      if (tipo === 'ajuste' && usuario.rol !== 'dueno') fail('sin_permiso', 'Solo el dueño corrige el stock.', 403)
      const n =
        tipo === 'ingreso'
          ? int(cantidad, { min: 1, max: 100000, what: 'la cantidad' })
          : int(cantidad, { min: 0, max: 100000, what: 'el stock contado' })
      const [{ mover_stock: stock }] = await sql.query('select mover_stock($1, $2, $3, $4, $5)', [
        uuid(productoId, 'el producto'),
        tipo,
        n,
        text(motivo, 120) || (tipo === 'ajuste' ? 'Ajuste por conteo' : 'Ingreso de mercadería'),
        usuario.id,
      ])
      return { stock }
    },
  },
  movimientos: {
    rol: 'dueno',
    run: async ({ productoId }, { sql }) =>
      sql.query(
        `select m.id, m.tipo, m.cantidad, m.stock_final, m.costo_unit, m.motivo, m.created_at, u.nombre as usuario
           from movimientos_stock m left join usuarios u on u.id = m.usuario_id
          where m.producto_id = $1 order by m.created_at desc, m.id desc limit 200`,
        [uuid(productoId, 'el producto')],
      ),
  },

  // ---------- Ventas ----------
  registrarVenta: {
    rol: 'todos',
    async run({ venta: v }, { sql, usuario }) {
      const items = Array.isArray(v?.items) ? v.items : []
      if (!items.length || items.length > 100) fail('venta_vacia', 'Agregá al menos un producto.')
      const payload = {
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
    async run({ mes: m }, { sql, usuario }) {
      const [desde, hasta] = rangoMes(mes(m))
      const dueno = usuario.rol === 'dueno'
      return sql.query(
        `select v.id, v.numero, v.fecha, v.cliente, v.medio_nombre, v.subtotal, v.descuento, v.total,
                ${dueno ? 'v.costo, v.comision,' : ''} v.estado, v.nota, v.created_at, u.nombre as usuario,
                (select json_agg(json_build_object('nombre', i.nombre, 'cantidad', i.cantidad, 'precio', i.precio_unit) order by i.id)
                   from venta_items i where i.venta_id = v.id) as items
           from ventas v left join usuarios u on u.id = v.usuario_id
          where v.fecha >= $1 and v.fecha < $2 ${dueno ? '' : 'and v.usuario_id = $3'}
          order by v.fecha desc, v.numero desc`,
        dueno ? [desde, hasta] : [desde, hasta, usuario.id],
      )
    },
  },
  anularVenta: {
    rol: 'dueno',
    async run({ id }, { sql, usuario }) {
      const [{ anular_venta: ok }] = await sql.query('select anular_venta($1, $2)', [uuid(id), usuario.id])
      return ok ? { ok } : fail('no_existe', 'Esa venta ya estaba anulada.')
    },
  },

  // ---------- Proveedores, compras y deudas ----------
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
    run: async (_, { sql }) =>
      sql.query(
        `select c.id, c.numero, c.fecha, c.vencimiento, c.total, c.nota, c.estado, c.proveedor_id, p.nombre as proveedor,
                coalesce((select sum(monto) from caja where compra_id = c.id), 0)::int as pagado,
                (select json_agg(json_build_object('nombre', i.nombre, 'cantidad', i.cantidad, 'costo', i.costo_unit) order by i.id)
                   from compra_items i where i.compra_id = c.id) as items
           from compras c left join proveedores p on p.id = c.proveedor_id
          order by c.fecha desc, c.numero desc limit 300`,
      ),
  },
  pagarCompra: {
    rol: 'dueno',
    async run({ compraId, monto, cuenta: cta, fecha: f }, { sql, usuario }) {
      const [compra] = await sql.query(
        `select c.id, c.numero, c.proveedor_id, c.total - coalesce((select sum(monto) from caja where compra_id = c.id), 0) as saldo
           from compras c where c.id = $1 and c.estado = 'ok'`,
        [uuid(compraId, 'la compra')],
      )
      if (!compra) fail('no_existe', 'Esa compra no existe.', 404)
      const pago = int(monto, { min: 1, what: 'el monto' })
      if (pago > Number(compra.saldo)) fail('invalido', 'El pago es mayor que lo que se debe.')
      await sql.query(
        `insert into caja (fecha, tipo, cuenta, monto, categoria, descripcion, compra_id, proveedor_id, usuario_id)
         values (coalesce($1::date, current_date), 'egreso', $2, $3, 'pago_proveedor', $4, $5, $6, $7)`,
        [fecha(f), cuenta(cta), pago, `Pago de la compra ${compra.numero}`, compra.id, compra.proveedor_id, usuario.id],
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

  // ---------- Caja ----------
  caja: {
    rol: 'dueno',
    async run({ mes: m }, { sql }) {
      const [desde, hasta] = rangoMes(mes(m))
      const [movimientos, saldos] = await Promise.all([
        sql.query(
          `select c.id, c.fecha, c.tipo, c.cuenta, c.monto, c.categoria, c.descripcion, c.venta_id, c.compra_id,
                  c.gasto_fijo_id, p.nombre as proveedor, g.nombre as gasto_fijo, u.nombre as usuario
             from caja c
             left join proveedores p on p.id = c.proveedor_id
             left join gastos_fijos g on g.id = c.gasto_fijo_id
             left join usuarios u on u.id = c.usuario_id
            where c.fecha >= $1 and c.fecha < $2
            order by c.fecha desc, c.created_at desc`,
          [desde, hasta],
        ),
        sql.query(
          `select cuenta, coalesce(sum(case when tipo = 'ingreso' then monto else -monto end), 0)::int as saldo
             from caja group by cuenta`,
        ),
      ])
      return {
        movimientos,
        saldos: Object.fromEntries(CUENTAS.map((c) => [c, saldos.find((s) => s.cuenta === c)?.saldo ?? 0])),
      }
    },
  },
  registrarMovimiento: {
    rol: 'dueno',
    async run({ movimiento: m }, { sql, usuario }) {
      const tipo = ['ingreso', 'egreso'].includes(m?.tipo) ? m.tipo : fail('invalido', 'Elegí si entra o sale plata.')
      const categoria = CATEGORIAS[tipo].includes(m.categoria) ? m.categoria : fail('invalido', 'Elegí la categoría.')
      if (categoria === 'pago_proveedor') fail('invalido', 'Los pagos a proveedores se cargan desde Compras.')
      const gastoFijo = categoria === 'gasto_fijo' ? uuid(m.gastoFijoId, 'el gasto fijo') : null
      const [row] = await sql.query(
        `insert into caja (fecha, tipo, cuenta, monto, categoria, descripcion, gasto_fijo_id, usuario_id)
         values (coalesce($1::date, current_date), $2, $3, $4, $5, $6, $7, $8) returning id`,
        [
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
    rol: 'dueno',
    async run({ id }, { sql }) {
      // Los cobros de ventas y los pagos de compras se deshacen anulando la venta o la compra.
      const [row] = await sql.query(
        'delete from caja where id = $1 and venta_id is null and compra_id is null returning id',
        [uuid(id)],
      )
      return row ?? fail('no_se_puede', 'Ese movimiento se deshace anulando su venta o su compra.')
    },
  },

  // ---------- Gastos fijos ----------
  gastosFijos: {
    rol: 'dueno',
    run: async (_, { sql }) =>
      sql.query('select id, nombre, monto, dia_pago, activo, orden from gastos_fijos order by orden, nombre'),
  },
  guardarGastoFijo: {
    rol: 'dueno',
    async run({ gasto: g }, { sql }) {
      const values = [
        required(g?.nombre, 'el nombre', 80),
        int(g?.monto ?? 0, { what: 'el monto' }),
        g?.dia_pago ? int(g.dia_pago, { min: 1, max: 31, what: 'el día de pago' }) : null,
        g?.activo !== false,
      ]
      if (g?.id) {
        const [row] = await sql.query(
          'update gastos_fijos set nombre = $2, monto = $3, dia_pago = $4, activo = $5 where id = $1 returning id',
          [uuid(g.id), ...values],
        )
        return row ?? fail('no_existe', 'Ese gasto ya no existe.', 404)
      }
      const [row] = await sql.query(
        `insert into gastos_fijos (nombre, monto, dia_pago, activo, orden)
         values ($1, $2, $3, $4, (select coalesce(max(orden) + 1, 0) from gastos_fijos)) returning id`,
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
   *   resultado    = contribución − gastos fijos del mes − sueldo del dueño − gastos variables
   * Las compras de mercadería no son gasto: se vuelven costo cuando el producto se vende.
   */
  finanzas: {
    rol: 'dueno',
    async run({ mes: m }, { sql }) {
      const periodo = mes(m)
      const [desde, hasta] = rangoMes(periodo)
      const [[totales], [fijos], [ajustes], [variables], productos, deudas, [stock], dias] = await Promise.all([
        sql.query(
          `select coalesce(sum(total), 0)::int as ventas, coalesce(sum(costo), 0)::int as costo,
                  coalesce(sum(comision), 0)::int as comision, count(*)::int as cantidad,
                  coalesce((select sum(i.cantidad) from venta_items i join ventas v2 on v2.id = i.venta_id
                             where v2.estado = 'ok' and v2.fecha >= $1 and v2.fecha < $2), 0)::int as unidades
             from ventas where estado = 'ok' and fecha >= $1 and fecha < $2`,
          [desde, hasta],
        ),
        sql.query('select coalesce(sum(monto), 0)::int as total from gastos_fijos where activo'),
        sql.query('select sueldo_dueno from ajustes where id = 1'),
        sql.query(
          `select coalesce(sum(monto) filter (where categoria = 'gasto_variable'), 0)::int as variables,
                  coalesce(sum(monto) filter (where categoria = 'otro_egreso'), 0)::int as otros
             from caja where tipo = 'egreso' and fecha >= $1 and fecha < $2`,
          [desde, hasta],
        ),
        // Rentabilidad por producto: el descuento y la comisión de cada venta se reparten entre sus productos.
        sql.query(
          `select coalesce(i.producto_id::text, i.nombre) as id, max(i.nombre) as nombre, sum(i.cantidad)::int as unidades,
                  round(sum(i.cantidad * i.precio_unit * v.total::numeric / v.subtotal))::int as ventas,
                  sum(i.cantidad * i.costo_unit)::int as costo,
                  round(sum(i.cantidad * i.precio_unit * v.comision::numeric / v.subtotal))::int as comision
             from venta_items i join ventas v on v.id = i.venta_id
            where v.estado = 'ok' and v.fecha >= $1 and v.fecha < $2
            group by 1 order by 4 desc`,
          [desde, hasta],
        ),
        sql.query(
          `select c.id, c.numero, c.fecha, c.vencimiento, p.nombre as proveedor,
                  (c.total - coalesce((select sum(monto) from caja where compra_id = c.id), 0))::int as saldo
             from compras c left join proveedores p on p.id = c.proveedor_id
            where c.estado = 'ok' and c.total > coalesce((select sum(monto) from caja where compra_id = c.id), 0)
            order by c.vencimiento nulls last, c.fecha`,
        ),
        sql.query(
          `select coalesce(sum(stock * costo) filter (where stock > 0), 0)::bigint as costo,
                  coalesce(sum(stock * precio) filter (where stock > 0), 0)::bigint as venta,
                  coalesce(sum(stock) filter (where stock > 0), 0)::int as unidades
             from productos where activo`,
        ),
        sql.query(
          `select fecha, sum(total)::int as total, count(*)::int as ventas from ventas
            where estado = 'ok' and fecha >= $1 and fecha < $2 group by fecha order by fecha`,
          [desde, hasta],
        ),
      ])
      const fijosMes = fijos.total + ajustes.sueldo_dueno
      return {
        mes: periodo,
        cantidadVentas: totales.cantidad,
        unidades: totales.unidades,
        gastosFijos: fijos.total,
        sueldoDueno: ajustes.sueldo_dueno,
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
        productos: productos.map((p) => ({ ...p, ganancia: p.ventas - p.costo - p.comision })),
        deudas,
        stock: { costo: Number(stock.costo), venta: Number(stock.venta), unidades: stock.unidades },
        dias,
      }
    },
  },

  // ---------- Ajustes, medios de pago y usuarios ----------
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
