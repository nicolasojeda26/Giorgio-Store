// Recorrido completo del sistema sobre Postgres real en memoria: dos locales, usuarios y permisos, stock por local,
// traspasos, ventas, compras y deudas, caja, gastos y el resumen financiero del mes (por local y total).
import { test, before } from 'node:test'
import assert from 'node:assert/strict'
import { CONFIG, client, createSystem, readySystem } from './helpers.js'

let s, mpId, efectivoId, perfumeA, perfumeB, proveedor, centro, norte

before(async () => {
  s = await readySystem()
  const { medios } = await s.dueno.ok('inicio')
  mpId = medios.find((m) => m.nombre === 'Mercado Pago').id
  efectivoId = medios.find((m) => m.nombre === 'Efectivo').id
  ;({ centro, norte } = s)
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

test('el vendedor no ve costos ni finanzas, ni puede corregir stock; el encargado ve su caja pero no finanzas', async () => {
  for (const action of [
    'finanzas',
    'caja',
    'compras',
    'gastosFijos',
    'usuarios',
    'guardarProducto',
    'anularVenta',
    'traspasos',
  ]) {
    assert.equal((await s.empleado.call(action, {})).status, 403, action)
  }
  for (const action of ['finanzas', 'compras', 'usuarios', 'guardarProducto', 'guardarGastoFijo', 'guardarSucursal']) {
    assert.equal((await s.encargada.call(action, {})).status, 403, action)
  }
  assert.equal((await s.encargada.call('caja', {})).status, 200)
  const yo = (await s.encargada.ok('inicio')).usuario
  assert.deepEqual([yo.rol, yo.sucursal_id, yo.sucursal], ['encargado', centro, 'Irigoyen'])
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
        stocks: { [centro]: 10, [norte]: 4 },
        stock_minimo: 3,
        proveedor_id: proveedor,
      },
    })
  ).id
  perfumeB = (
    await s.dueno.ok('guardarProducto', {
      producto: { nombre: 'Árabe B 50 ml', costo: 6000, precio: 17500, stocks: { [centro]: 2 }, stock_minimo: 2 },
    })
  ).id
  const repetido = await s.dueno.call('guardarProducto', { producto: { nombre: 'X', codigo: 'A1' } })
  assert.equal(repetido.status, 200)
  assert.equal(
    (await s.dueno.call('guardarProducto', { producto: { nombre: 'Y', codigo: 'A1' } })).body.error.code,
    'repetido',
  )

  // Cada uno ve el stock de su local y, aparte, el de los dos.
  const { productos } = await s.empleado.ok('productos')
  const a = productos.find((p) => p.id === perfumeA)
  assert.equal(a.stock, 10)
  assert.deepEqual(a.stocks, { [centro]: 10, [norte]: 4 })
  assert.ok(!('costo' in a))
  assert.equal((await s.vendedorNorte.ok('productos')).productos.find((p) => p.id === perfumeA).stock, 4)
  assert.equal((await s.dueno.ok('productos')).productos.find((p) => p.id === perfumeA).stock, 14)
  assert.equal((await s.dueno.ok('productos', { sucursalId: norte })).productos.find((p) => p.id === perfumeA).stock, 4)
  const movs = await s.dueno.ok('movimientos', { productoId: perfumeA, sucursalId: centro })
  assert.deepEqual(
    [movs[0].tipo, movs[0].cantidad, movs[0].motivo, movs[0].sucursal],
    ['ingreso', 10, 'Stock inicial', 'Irigoyen'],
  )
  // La encargada ve los movimientos de su local, sin costos.
  const suyos = await s.encargada.ok('movimientos', { productoId: perfumeA, sucursalId: norte })
  assert.ok(suyos.every((m) => m.sucursal === 'Irigoyen' && !('costo_unit' in m)))
})

test('venta cargada por un vendedor: descuenta stock de su local, guarda el costo y cobra neto de comisión', async () => {
  const venta = await s.empleado.ok('registrarVenta', {
    venta: {
      // Aunque mande otro local, la venta queda en el suyo.
      sucursalId: norte,
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
  const [caja] = await s.sql.query('select monto, cuenta, categoria, sucursal_id from caja where venta_id = $1', [
    venta.id,
  ])
  assert.deepEqual(caja, { monto: 65500 - 4985, cuenta: 'mercado_pago', categoria: 'venta', sucursal_id: centro })
  const { productos } = await s.dueno.ok('productos', { sucursalId: centro })
  assert.equal(productos.find((p) => p.id === perfumeA).stock, 8)
  assert.equal(productos.find((p) => p.id === perfumeB).stock, 1)
  assert.equal(productos.find((p) => p.id === perfumeA).stocks[norte], 4)
  // Queda en el inicio como stock bajo (B tiene 1 con mínimo 2 en Irigoyen).
  const bajo = (await s.dueno.ok('inicio')).stockBajo
  assert.ok(bajo.some((p) => p.id === perfumeB && p.sucursal_id === centro))
  assert.ok(!(await s.vendedorNorte.ok('inicio')).stockBajo.some((p) => p.id === perfumeA))

  // El vendedor ve solo sus ventas y sin costos; el otro local no las ve; el dueño filtra por local.
  const lista = await s.empleado.ok('ventas', {})
  assert.equal(lista.length, 1)
  assert.ok(!('costo' in lista[0]))
  assert.equal(lista[0].items.length, 2)
  assert.equal((await s.vendedorNorte.ok('ventas', {})).length, 0)
  assert.equal((await s.encargada.ok('ventas', {})).length, 1)
  assert.equal((await s.dueno.ok('ventas', { sucursalId: norte })).length, 0)
  assert.equal((await s.dueno.ok('ventas', {}))[0].sucursal, 'Irigoyen')
  // El dueño tiene que elegir el local para vender.
  const sinLocal = await s.dueno.call('registrarVenta', {
    venta: { medioPagoId: efectivoId, items: [{ productoId: perfumeA, cantidad: 1, precio: 1 }] },
  })
  assert.equal(sinLocal.status, 400)
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

test('anular una venta devuelve el stock y saca el cobro de la caja; la encargada solo anula en su local', async () => {
  const v = await s.vendedorNorte.ok('registrarVenta', {
    venta: { medioPagoId: efectivoId, items: [{ productoId: perfumeA, cantidad: 1, precio: 25000 }] },
  })
  assert.equal((await s.encargada.call('anularVenta', { id: v.id })).status, 403)
  await s.dueno.ok('anularVenta', { id: v.id })
  assert.equal((await s.dueno.call('anularVenta', { id: v.id })).status, 400)
  const { productos } = await s.dueno.ok('productos', { sucursalId: norte })
  assert.equal(productos.find((p) => p.id === perfumeA).stock, 4)
  assert.equal((await s.sql.query('select count(*)::int as n from caja where venta_id = $1', [v.id]))[0].n, 0)
})

test('stock: el vendedor ingresa mercadería; la encargada y el dueño ajustan por conteo', async () => {
  assert.equal((await s.empleado.ok('moverStock', { productoId: perfumeB, tipo: 'ingreso', cantidad: 4 })).stock, 5)
  assert.equal((await s.empleado.call('moverStock', { productoId: perfumeB, tipo: 'ajuste', cantidad: 1 })).status, 403)
  assert.equal(
    (await s.encargada.ok('moverStock', { productoId: perfumeB, tipo: 'ajuste', cantidad: 4, motivo: 'Conteo' })).stock,
    4,
  )
  const [m] = await s.dueno.ok('movimientos', { productoId: perfumeB })
  assert.deepEqual([m.tipo, m.cantidad, m.stock_final, m.motivo], ['ajuste', -1, 4, 'Conteo'])
  // Contar en el otro local (donde no había) arranca de cero.
  assert.equal(
    (await s.dueno.ok('moverStock', { productoId: perfumeB, sucursalId: norte, tipo: 'ajuste', cantidad: 1 })).stock,
    1,
  )
})

test('traspaso entre locales: sale de uno y entra en el otro; no deja mandar más de lo que hay; se anula', async () => {
  // La encargada manda desde su local (Irigoyen) a Sucursal 2.
  const t = await s.encargada.ok('registrarTraspaso', {
    traspaso: { destinoId: norte, items: [{ productoId: perfumeA, cantidad: 3 }] },
  })
  assert.equal(t.numero, 1)
  let a = (await s.dueno.ok('productos')).productos.find((p) => p.id === perfumeA)
  assert.deepEqual(a.stocks, { [centro]: 5, [norte]: 7 })
  const demasiado = await s.encargada.call('registrarTraspaso', {
    traspaso: { destinoId: norte, items: [{ productoId: perfumeA, cantidad: 50 }] },
  })
  assert.equal(demasiado.body.error.code, 'stock_insuficiente')
  const mismo = await s.dueno.call('registrarTraspaso', {
    traspaso: { origenId: norte, destinoId: norte, items: [{ productoId: perfumeA, cantidad: 1 }] },
  })
  assert.equal(mismo.body.error.code, 'traspaso_invalido')
  assert.equal((await s.empleado.call('registrarTraspaso', { traspaso: {} })).status, 403)
  const lista = await s.encargada.ok('traspasos', {})
  assert.deepEqual([lista[0].origen, lista[0].destino, lista[0].items[0].cantidad], ['Irigoyen', 'Sucursal 2', 3])

  // El dueño manda 1 de vuelta y lo anula.
  const vuelta = await s.dueno.ok('registrarTraspaso', {
    traspaso: { origenId: norte, destinoId: centro, items: [{ productoId: perfumeA, cantidad: 1 }] },
  })
  await s.dueno.ok('anularTraspaso', { id: vuelta.id })
  a = (await s.dueno.ok('productos')).productos.find((p) => p.id === perfumeA)
  assert.deepEqual(a.stocks, { [centro]: 5, [norte]: 7 })
  assert.equal((await s.encargada.call('anularTraspaso', { id: t.id })).status, 403)
})

test('compra a proveedor: suma stock, actualiza el costo, deja la deuda y se paga en cuotas', async () => {
  const compra = await s.dueno.ok('registrarCompra', {
    compra: {
      proveedorId: proveedor,
      sucursalId: centro,
      vencimiento: '2099-01-10',
      pago: 50000,
      cuenta: 'efectivo',
      items: [{ productoId: perfumeA, cantidad: 12, costo: 11000 }],
    },
  })
  assert.equal(compra.total, 132000)
  const { productos } = await s.dueno.ok('productos', { sucursalId: centro })
  const a = productos.find((p) => p.id === perfumeA)
  assert.deepEqual([a.stock, a.costo], [17, 11000])

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
    compra: {
      sucursalId: norte,
      items: [{ productoId: perfumeB, cantidad: 3, costo: 6000 }],
      pago: 18000,
      cuenta: 'efectivo',
    },
  })
  await s.dueno.ok('anularCompra', { id: otra.id })
  lista = await s.dueno.ok('compras')
  assert.equal(lista.find((c) => c.id === otra.id).estado, 'anulada')
  assert.equal(lista.find((c) => c.id === otra.id).sucursal, 'Sucursal 2')
  assert.equal((await s.dueno.ok('productos', { sucursalId: norte })).productos.find((p) => p.id === perfumeB).stock, 1)
})

test('caja por local: gastos del local y generales, saldos, y lo que puede hacer la encargada', async () => {
  const gastos = await s.dueno.ok('gastosFijos')
  const alquilerCentro = gastos.find((g) => g.nombre === 'Alquiler' && g.sucursal_id === centro)
  const alquilerNorte = gastos.find((g) => g.nombre === 'Alquiler' && g.sucursal_id === norte)
  const monotributo = gastos.find((g) => g.nombre === 'Monotributo')
  assert.equal(monotributo.sucursal_id, null)
  await s.dueno.ok('guardarGastoFijo', { gasto: { ...alquilerCentro, monto: 300000, dia_pago: 10 } })
  await s.dueno.ok('guardarGastoFijo', { gasto: { ...alquilerNorte, monto: 200000 } })
  await s.dueno.ok('guardarGastoFijo', { gasto: { ...monotributo, monto: 100000 } })

  // La encargada ve solo los gastos de su local y paga el alquiler desde su caja.
  const suyos = await s.encargada.ok('gastosFijos')
  assert.ok(suyos.every((g) => g.sucursal_id === centro))
  await s.encargada.ok('registrarMovimiento', {
    movimiento: {
      tipo: 'egreso',
      categoria: 'gasto_fijo',
      gastoFijoId: alquilerCentro.id,
      cuenta: 'banco',
      monto: 300000,
    },
  })
  assert.equal((await s.encargada.ok('gastosFijos')).find((g) => g.id === alquilerCentro.id).pagado_mes, 300000)
  const ajeno = await s.encargada.call('registrarMovimiento', {
    movimiento: { tipo: 'egreso', categoria: 'gasto_fijo', gastoFijoId: alquilerNorte.id, cuenta: 'banco', monto: 1 },
  })
  assert.equal(ajeno.status, 403)
  const retiro = await s.encargada.call('registrarMovimiento', {
    movimiento: { tipo: 'egreso', categoria: 'retiro', cuenta: 'efectivo', monto: 1 },
  })
  assert.equal(retiro.status, 403)
  await s.encargada.ok('registrarMovimiento', {
    movimiento: {
      tipo: 'egreso',
      categoria: 'gasto_variable',
      cuenta: 'efectivo',
      monto: 15000,
      descripcion: 'Bolsas y moños',
    },
  })
  // Gasto variable en el otro local, cargado por el dueño.
  await s.dueno.ok('registrarMovimiento', {
    movimiento: { sucursalId: norte, tipo: 'egreso', categoria: 'gasto_variable', cuenta: 'efectivo', monto: 5000 },
  })
  const aporte = await s.dueno.ok('registrarMovimiento', {
    movimiento: { sucursalId: centro, tipo: 'ingreso', categoria: 'aporte', cuenta: 'efectivo', monto: 100000 },
  })
  const proveedorManual = await s.dueno.call('registrarMovimiento', {
    movimiento: { sucursalId: centro, tipo: 'egreso', categoria: 'pago_proveedor', cuenta: 'efectivo', monto: 1 },
  })
  assert.equal(proveedorManual.status, 400)

  const { movimientos, saldos } = await s.encargada.ok('caja', {})
  assert.ok(movimientos.every((m) => m.sucursal_id === centro))
  const venta = movimientos.find((m) => m.categoria === 'venta')
  assert.equal((await s.encargada.call('borrarMovimiento', { id: venta.id })).body.error.code, 'no_se_puede')
  assert.equal((await s.encargada.call('borrarMovimiento', { id: aporte.id })).body.error.code, 'no_se_puede')
  // Irigoyen: efectivo +100.000 aporte −50.000 compra −15.000 bolsas · banco −32.000 −300.000 · MP +60.515
  assert.deepEqual(saldos, { efectivo: 35000, banco: -332000, mercado_pago: 60515 })
  await s.dueno.ok('borrarMovimiento', { id: aporte.id })
  assert.equal((await s.dueno.ok('caja', { sucursalId: centro })).saldos.efectivo, -65000)
  assert.equal((await s.dueno.ok('caja', { sucursalId: norte })).saldos.efectivo, -5000)
  assert.equal((await s.dueno.ok('caja', {})).saldos.efectivo, -70000)
})

test('finanzas: total con gastos generales y sueldo; por local, solo lo del local; comparación entre locales', async () => {
  await s.dueno.ok('guardarAjustes', {
    ajustes: { negocio: 'Giorgio', sueldo_dueno: 500000, iva_comision: 21, redondeo: 100 },
  })
  const f = await s.dueno.ok('finanzas', {})
  const r = f.resumen
  assert.equal(r.ventas, 65500)
  assert.equal(r.costoMercaderia, 26000)
  assert.equal(r.comisiones, 4985)
  assert.equal(r.contribucion, 65500 - 26000 - 4985)
  assert.equal(f.gastosFijos, 600000) // 300.000 + 200.000 alquileres + 100.000 monotributo
  assert.equal(f.gastosGenerales, 100000)
  assert.equal(r.fijos, 1100000)
  assert.equal(r.otrosEgresos, 20000)
  assert.equal(r.resultado, r.contribucion - 1100000 - 20000)
  assert.equal(r.equilibrio.ventas, Math.ceil(1100000 / (r.contribucion / 65500)))
  assert.equal(f.unidades, 3)
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

  // Irigoyen: su alquiler y sus gastos variables, sin monotributo ni sueldo.
  const c = await s.dueno.ok('finanzas', { sucursalId: centro })
  assert.deepEqual(
    [c.resumen.ventas, c.resumen.fijos, c.resumen.otrosEgresos, c.sueldoDueno],
    [65500, 300000, 15000, 0],
  )
  assert.equal(c.resumen.resultado, c.resumen.contribucion - 300000 - 15000)
  assert.equal(c.deudas.length, 1)
  const n = await s.dueno.ok('finanzas', { sucursalId: norte })
  assert.deepEqual([n.resumen.ventas, n.resumen.fijos, n.resumen.equilibrio.posible], [0, 200000, false])
  assert.equal(n.deudas.length, 0)

  const [lc, ln] = f.porLocal
  assert.deepEqual([lc.nombre, lc.ventas, lc.fijos, lc.variables], ['Irigoyen', 65500, 300000, 15000])
  assert.equal(lc.resultado, c.resumen.resultado)
  assert.deepEqual([ln.nombre, ln.resultado], ['Sucursal 2', -205000])
  // La suma de los locales menos generales y sueldo da el total.
  assert.equal(lc.resultado + ln.resultado - 100000 - 500000, r.resultado)
})

test('locales: el dueño los renombra y no puede quedarse sin ninguno activo', async () => {
  await s.dueno.ok('guardarSucursal', { sucursal: { id: norte, nombre: 'Junín', direccion: 'Junín 1200' } })
  assert.equal((await s.dueno.ok('inicio')).sucursales.find((x) => x.id === norte).nombre, 'Junín')
  await s.dueno.ok('guardarSucursal', { sucursal: { id: norte, nombre: 'Junín', activo: false } })
  const ultimo = await s.dueno.call('guardarSucursal', { sucursal: { id: centro, nombre: 'Irigoyen', activo: false } })
  assert.equal(ultimo.status, 400)
  await s.dueno.ok('guardarSucursal', { sucursal: { id: norte, nombre: 'Junín', activo: true } })
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
  assert.equal((await s.dueno.call('guardarUsuario', { usuario: { ...yo, rol: 'vendedor' } })).status, 400)
  // Vendedor sin local: no se puede.
  const sinLocal = await s.dueno.call('guardarUsuario', {
    usuario: { nombre: 'Z', email: 'z@mail.com', rol: 'vendedor', password: '12345678' },
  })
  assert.equal(sinLocal.body.error.code, 'sucursal')
  // Pasar a Beto al otro local le cierra la sesión.
  const beto = lista.find((u) => u.email === 'beto@mail.com')
  assert.equal(beto.sucursal, 'Junín')
  await s.dueno.ok('guardarUsuario', { usuario: { ...beto, sucursal_id: centro } })
  assert.equal((await s.vendedorNorte.call('inicio')).status, 401)
})
