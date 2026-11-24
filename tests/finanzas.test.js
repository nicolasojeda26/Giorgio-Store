// Cuentas de las calculadoras y del resumen (shared/finanzas.js).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { analizarPrecio, calcularPrecio, descuentoMedio, puntoEquilibrio, simularMes } from '../shared/finanzas.js'

test('descuento del medio de pago: comisión, IVA de la comisión y retenciones', () => {
  assert.deepEqual(descuentoMedio(50000, { comision_pct: 6.29, aplica_iva: true, retencion_pct: 0 }), {
    comision: 3145,
    iva: 660,
    retencion: 0,
    total: 3805,
  })
  assert.equal(descuentoMedio(10000, { comision_pct: 0, retencion_pct: 1.5 }).total, 150)
  assert.equal(descuentoMedio(10000, null).total, 0)
})

test('precio sugerido: cubre costos, comisiones con IVA, retenciones, envío y deja la ganancia pedida', () => {
  const r = calcularPrecio({
    costos: [
      { nombre: 'Perfume', monto: 10000 },
      { nombre: 'Bolsa', monto: 500 },
    ],
    medioPago: 6.29,
    ivaComision: 21,
    retenciones: 1,
    envio: 0,
    ganancia: { modo: 'porcentaje', valor: 100 },
    redondeo: 0,
  })
  assert.ok(r.valido)
  // Con el precio exacto, la ganancia real es la pedida (100 % del costo = 10.500), salvo redondeo.
  assert.ok(Math.abs(r.ganancia - 10500) <= 1)
  const redondeado = calcularPrecio({
    costos: [{ monto: 10000 }],
    medioPago: 6.29,
    ganancia: { modo: 'fijo', valor: 5000 },
  })
  assert.equal(redondeado.precio % 100, 0)
  assert.ok(redondeado.ganancia >= 5000)
  assert.equal(calcularPrecio({ costos: [{ monto: 1 }], plataforma: 60, medioPago: 30 }).valido, false)
})

test('analizar un precio ya puesto: muestra si se pierde plata', () => {
  const r = analizarPrecio({ precio: 12000, costo: 10000, medioPago: 6.29, ivaComision: 21, envio: 2000 })
  assert.equal(r.pierde, true)
  assert.equal(r.desglose.medioPago, 755)
  assert.equal(r.desglose.iva, 159)
  assert.ok(Math.abs(r.markup - 0.2) < 1e-9)
})

test('simulador del mes y ventas mínimas para no perder', () => {
  const r = simularMes({
    productos: [
      { nombre: 'A', ganancia: 9000, ventas: 8 },
      { nombre: 'B', ganancia: 5000, ventas: 36 },
    ],
    gastosFijos: 243090,
    sueldo: 0,
  })
  assert.equal(r.gananciaTotal, 252000)
  assert.equal(r.unidades, 44)
  assert.equal(r.resultado, 252000 - 243090)
  assert.equal(r.ventasMinimas, Math.ceil(243090 / (252000 / 44)))
  assert.equal(r.rentable, true)
})

test('punto de equilibrio', () => {
  const pe = puntoEquilibrio({ fijos: 800000, margenContribucion: 0.4, gananciaPorUnidad: 8000, vendido: 1000000 })
  assert.deepEqual([pe.ventas, pe.unidades, pe.falta], [2000000, 100, 1000000])
  assert.equal(pe.avance, 0.5)
  assert.equal(puntoEquilibrio({ fijos: 1, margenContribucion: 0 }).posible, false)
})
