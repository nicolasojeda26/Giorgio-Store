// Recorrido completo del sistema sobre Postgres real en memoria: usuarios y permisos, stock, ventas,
// compras y deudas, caja, gastos y el resumen financiero del mes.
import { test, before } from 'node:test'
import assert from 'node:assert/strict'
import { CONFIG, client, createSystem, readySystem } from './helpers.js'

let s, mpId, efectivoId, perfumeA, perfumeB, proveedor

before(async () => {
  s = await readySystem()
  const { medios } = await s.dueno.ok('inicio')
  mpId = medios.find((m) => m.nombre === 'Mercado Pago').id
  efectivoId = medios.find((m) => m.nombre === 'Efectivo').id
})

test('primer usuario: solo con el código y una sola vez; después se ingresa con email', async () => {
  const nuevo = await createSystem()
  const c = client(nuevo.deps)
  assert.deepEqual(await c.session(), { usuario: null, primerUso: true })
  const mal = await c.call('primerUsuario', { codigo: 'otro', nombre: 'X', email: 'x@x.com', password: '12345678' })
  assert.equal(mal.status, 401)
  const ok = await c.call('primerUsuario', {
    codigo: CONFIG.setupCode,
    nombre: 'G',
    email: 'G@Mail.com',
    password: '12345678',
  })
  assert.deepEqual(ok.body.usuario.rol, 'dueno')
  const otra = await client(nuevo.deps).call('primerUsuario', {
    codigo: CONFIG.setupCode,
    nombre: 'Y',
    email: 'y@y.com',
    password: '12345678',
  })
  assert.equal(otra.body.error.code, 'ya_configurado')
  const mala = await client(nuevo.deps).call('ingresar', { email: 'g@mail.com', password: 'mal' })
  assert.equal(mala.status, 401)
})

test('el empleado no ve costos ni finanzas, ni puede corregir stock', async () => {
  for (const action of ['finanzas', 'caja', 'compras', 'gastosFijos', 'usuarios', 'guardarProducto', 'anularVenta']) {
    assert.equal((await s.empleado.call(action, {})).status, 403, action)
  }
  const { medios, ajustes } = await s.empleado.ok('inicio')
  assert.ok(!('comision_pct' in medios[0]))
  assert.ok(!('sueldo_dueno' in ajustes))
  const sinApp = await s.empleado.call('productos', {}, { 'x-giorgio-sistema': '' })
  assert.equal(sinApp.status, 403)
})

test('productos: alta con stock inicial; el empleado los ve sin costo', async () => {
  proveedor = (await s.dueno.ok('guardarProveedor', { proveedor: { nombre: 'Distribuidora Norte' } })).id
  perfumeA = (
    await s.dueno.ok('guardarProducto', {
      producto: {
        nombre: 'Perfume A 100 ml',
        costo: 10000,
        precio: 25000,
        stock: 10,
        stock_minimo: 3,
        proveedor_id: proveedor,
      },
    })
  ).id
  perfumeB = (
    await s.dueno.ok('guardarProducto', {
      producto: { nombre: 'Árabe B 50 ml', costo: 6000, precio: 17500, stock: 2, stock_minimo: 2 },
    })
  ).id
  const repetido = await s.dueno.call('guardarProducto', { producto: { nombre: 'X', codigo: 'A1' } })
  assert.equal(repetido.status, 200)
  assert.equal(
    (await s.dueno.call('guardarProducto', { producto: { nombre: 'Y', codigo: 'A1' } })).body.error.code,
    'repetido',
  )

  const { productos } = await s.empleado.ok('productos')
  const a = productos.find((p) => p.id === perfumeA)
  assert.equal(a.stock, 10)
  assert.ok(!('costo' in a))
  const movs = await s.dueno.ok('movimientos', { productoId: perfumeA })
  assert.deepEqual([movs[0].tipo, movs[0].cantidad, movs[0].motivo], ['ingreso', 10, 'Stock inicial'])
})

test('venta cargada por un empleado: descuenta stock, guarda el costo y cobra neto de comisión', async () => {
  const venta = await s.empleado.ok('registrarVenta', {
    venta: {
      medioPagoId: mpId,
      cliente: 'Juana',
      descuento: 2000,
      items: [
        { productoId: perfumeA, cantidad: 2, precio: 25000 },
        { productoId: perfumeB, cantidad: 1, precio: 17500 },
      ],
    },
  })
  assert.equal(venta.total, 65500)
  const [row] = await s.sql.query('select costo, comision, usuario_id from ventas where id = $1', [venta.id])
  // 65.500 x 6,29 % = 4.120 de comisión + 21 % de IVA = 865
  assert.deepEqual([row.costo, row.comision], [26000, 4120 + 865])
  const [caja] = await s.sql.query('select monto, cuenta, categoria from caja where venta_id = $1', [venta.id])
  assert.deepEqual(caja, { monto: 65500 - 4985, cuenta: 'mercado_pago', categoria: 'venta' })
  const { productos } = await s.dueno.ok('productos')
  assert.equal(productos.find((p) => p.id === perfumeA).stock, 8)
  assert.equal(productos.find((p) => p.id === perfumeB).stock, 1)
  // Queda en el inicio como stock bajo (B tiene 1 con mínimo 2).
  assert.ok((await s.dueno.ok('inicio')).stockBajo.some((p) => p.id === perfumeB))

  // El empleado ve solo sus ventas y sin costos.
  const lista = await s.empleado.ok('ventas', {})
  assert.equal(lista.length, 1)
  assert.ok(!('costo' in lista[0]))
  assert.equal(lista[0].items.length, 2)
})

test('validaciones de la venta', async () => {
  const vacia = await s.empleado.call('registrarVenta', { venta: { medioPagoId: efectivoId, items: [] } })
  assert.equal(vacia.body.error.code, 'venta_vacia')
  const desc = await s.empleado.call('registrarVenta', {
    venta: { medioPagoId: efectivoId, descuento: 999999, items: [{ productoId: perfumeA, cantidad: 1, precio: 1000 }] },
  })
  assert.equal(desc.body.error.code, 'descuento_invalido')
  const fantasma = await s.empleado.call('registrarVenta', {
    venta: {
      medioPagoId: efectivoId,
      items: [{ productoId: '00000000-0000-4000-8000-000000000000', cantidad: 1, precio: 1000 }],
    },
  })
  assert.equal(fantasma.body.error.code, 'producto_invalido')
  assert.equal(Number((await s.sql.query('select count(*) from ventas'))[0].count), 1)
})

test('anular una venta devuelve el stock y saca el cobro de la caja', async () => {
  const v = await s.dueno.ok('registrarVenta', {
    venta: { medioPagoId: efectivoId, items: [{ productoId: perfumeA, cantidad: 1, precio: 25000 }] },
  })
  await s.dueno.ok('anularVenta', { id: v.id })
  assert.equal((await s.dueno.call('anularVenta', { id: v.id })).status, 400)
  const { productos } = await s.dueno.ok('productos')
  assert.equal(productos.find((p) => p.id === perfumeA).stock, 8)
  assert.equal((await s.sql.query('select count(*)::int as n from caja where venta_id = $1', [v.id]))[0].n, 0)
})

test('stock: el empleado ingresa mercadería; el dueño ajusta por conteo', async () => {
  assert.equal((await s.empleado.ok('moverStock', { productoId: perfumeB, tipo: 'ingreso', cantidad: 4 })).stock, 5)
  assert.equal((await s.empleado.call('moverStock', { productoId: perfumeB, tipo: 'ajuste', cantidad: 1 })).status, 403)
  assert.equal(
    (await s.dueno.ok('moverStock', { productoId: perfumeB, tipo: 'ajuste', cantidad: 4, motivo: 'Conteo' })).stock,
    4,
  )
  const [m] = await s.dueno.ok('movimientos', { productoId: perfumeB })
  assert.deepEqual([m.tipo, m.cantidad, m.stock_final, m.motivo], ['ajuste', -1, 4, 'Conteo'])
})

test('compra a proveedor: suma stock, actualiza el costo, deja la deuda y se paga en cuotas', async () => {
  const compra = await s.dueno.ok('registrarCompra', {
    compra: {
      proveedorId: proveedor,
      vencimiento: '2099-01-10',
      pago: 50000,
      cuenta: 'efectivo',
      items: [{ productoId: perfumeA, cantidad: 12, costo: 11000 }],
    },
  })
  assert.equal(compra.total, 132000)
  const { productos } = await s.dueno.ok('productos')
  const a = productos.find((p) => p.id === perfumeA)
  assert.deepEqual([a.stock, a.costo], [20, 11000])

  let lista = await s.dueno.ok('compras')
  assert.equal(lista[0].pagado, 50000)
  assert.equal((await s.dueno.call('pagarCompra', { compraId: compra.id, monto: 90000, cuenta: 'banco' })).status, 400)
  await s.dueno.ok('pagarCompra', { compraId: compra.id, monto: 32000, cuenta: 'banco' })
  const fin = await s.dueno.ok('finanzas', {})
  assert.deepEqual(
    fin.deudas.map((d) => d.saldo),
    [50000],
  )

  // Anular la compra saca el stock y los pagos.
  const otra = await s.dueno.ok('registrarCompra', {
    compra: { items: [{ productoId: perfumeB, cantidad: 3, costo: 6000 }], pago: 18000, cuenta: 'efectivo' },
  })
  await s.dueno.ok('anularCompra', { id: otra.id })
  lista = await s.dueno.ok('compras')
  assert.equal(lista.find((c) => c.id === otra.id).estado, 'anulada')
  assert.equal((await s.dueno.ok('productos')).productos.find((p) => p.id === perfumeB).stock, 4)
})

test('caja: movimientos manuales, saldos por cuenta y lo que no se puede borrar', async () => {
  const gastos = await s.dueno.ok('gastosFijos')
  const alquiler = gastos.find((g) => g.nombre === 'Alquiler')
  await s.dueno.ok('guardarGastoFijo', { gasto: { ...alquiler, monto: 300000, dia_pago: 10 } })
  await s.dueno.ok('registrarMovimiento', {
    movimiento: { tipo: 'egreso', categoria: 'gasto_fijo', gastoFijoId: alquiler.id, cuenta: 'banco', monto: 300000 },
  })
  await s.dueno.ok('registrarMovimiento', {
    movimiento: {
      tipo: 'egreso',
      categoria: 'gasto_variable',
      cuenta: 'efectivo',
      monto: 15000,
      descripcion: 'Bolsas y moños',
    },
  })
  const aporte = await s.dueno.ok('registrarMovimiento', {
    movimiento: { tipo: 'ingreso', categoria: 'aporte', cuenta: 'efectivo', monto: 100000 },
  })
  const proveedorManual = await s.dueno.call('registrarMovimiento', {
    movimiento: { tipo: 'egreso', categoria: 'pago_proveedor', cuenta: 'efectivo', monto: 1 },
  })
  assert.equal(proveedorManual.status, 400)

  const { movimientos, saldos } = await s.dueno.ok('caja', {})
  const venta = movimientos.find((m) => m.categoria === 'venta')
  assert.equal((await s.dueno.call('borrarMovimiento', { id: venta.id })).body.error.code, 'no_se_puede')
  await s.dueno.ok('borrarMovimiento', { id: aporte.id })
  // efectivo: −50.000 compra −15.000 bolsas · banco: −32.000 −300.000 · MP: +60.515
  assert.deepEqual(saldos, { efectivo: -65000 + 100000, banco: -332000, mercado_pago: 60515 })
  assert.equal((await s.dueno.ok('caja', {})).saldos.efectivo, -65000)
})

test('finanzas del mes: contribución, resultado, punto de equilibrio y rentabilidad por producto', async () => {
  await s.dueno.ok('guardarAjustes', {
    ajustes: { negocio: 'Giorgio', sueldo_dueno: 500000, iva_comision: 21, redondeo: 100 },
  })
  const f = await s.dueno.ok('finanzas', {})
  const r = f.resumen
  assert.equal(r.ventas, 65500)
  assert.equal(r.costoMercaderia, 26000)
  assert.equal(r.comisiones, 4985)
  assert.equal(r.contribucion, 65500 - 26000 - 4985)
  assert.equal(f.gastosFijos, 300000)
  assert.equal(r.fijos, 800000)
  assert.equal(r.otrosEgresos, 15000)
  assert.equal(r.resultado, r.contribucion - 800000 - 15000)
  assert.equal(r.equilibrio.ventas, Math.ceil(800000 / (r.contribucion / 65500)))
  assert.equal(f.unidades, 3)
  // El descuento y la comisión se reparten entre los productos de la venta.
  const a = f.productos.find((p) => p.nombre === 'Perfume A 100 ml')
  assert.deepEqual([a.unidades, a.costo], [2, 20000])
  assert.equal(
    f.productos.reduce((s2, p) => s2 + p.ventas, 0),
    65500,
  )
  assert.deepEqual(
    f.dias.map((d) => d.total),
    [65500],
  )
  assert.ok(f.stock.costo > 0)
})

test('usuarios: el dueño cambia la contraseña de un empleado y lo desactiva', async () => {
  const lista = await s.dueno.ok('usuarios')
  const ana = lista.find((u) => u.email === 'ana@mail.com')
  await s.dueno.ok('guardarUsuario', { usuario: { ...ana, password: 'nueva-clave-ana' } })
  assert.equal((await s.empleado.call('inicio')).status, 401)
  const ana2 = client(s.deps, { ip: '3.3.3.3' })
  await ana2.ok('ingresar', { email: 'ana@mail.com', password: 'nueva-clave-ana' })
  await s.dueno.ok('guardarUsuario', { usuario: { ...ana, activo: false } })
  assert.equal((await ana2.call('inicio')).status, 401)
  const yo = lista.find((u) => u.rol === 'dueno')
  assert.equal((await s.dueno.call('guardarUsuario', { usuario: { ...yo, rol: 'empleado' } })).status, 400)
})
