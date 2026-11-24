// Cuentas del sistema. Son JavaScript puro: las usan el servidor, las pantallas y los tests.
// Todos los montos son pesos enteros; los porcentajes, números como 6.29 (= 6,29 %).

const num = (value) => {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}
const pct = (value) => num(value) / 100

/** Cuánto se lleva el medio de pago de un cobro: comisión, IVA sobre la comisión y retenciones. */
export function descuentoMedio(total, medio, ivaComision = 21) {
  if (!medio) return { comision: 0, iva: 0, retencion: 0, total: 0 }
  const comision = num(total) * pct(medio.comision_pct)
  const iva = medio.aplica_iva ? comision * pct(ivaComision) : 0
  const retencion = num(total) * pct(medio.retencion_pct)
  const round = (n) => Math.round(n)
  return {
    comision: round(comision),
    iva: round(iva),
    retencion: round(retencion),
    total: round(comision) + round(iva) + round(retencion),
  }
}

/**
 * Calculadora de precio de venta.
 * costos: [{ nombre, monto }]  -> costo del producto + packaging, etiqueta, envío al local, etc.
 * descuentos en % sobre el precio: plataforma, cuotas, medioPago, retenciones; ivaComision se aplica
 * sobre la suma de las tres comisiones. envio: pesos a cargo del vendedor por venta.
 * ganancia: { modo: 'fijo' | 'porcentaje', valor }  (porcentaje sobre el costo).
 * redondeo: múltiplo al que se sube el precio sugerido (0 = sin redondear).
 */
export function calcularPrecio({
  costos = [],
  plataforma = 0,
  cuotas = 0,
  medioPago = 0,
  ivaComision = 21,
  retenciones = 0,
  envio = 0,
  ganancia = { modo: 'porcentaje', valor: 50 },
  redondeo = 100,
}) {
  const costo = costos.reduce((s, c) => s + num(c.monto), 0)
  const comisiones = pct(plataforma) + pct(cuotas) + pct(medioPago)
  const tasa = comisiones * (1 + pct(ivaComision)) + pct(retenciones)
  const gananciaBuscada = ganancia.modo === 'fijo' ? num(ganancia.valor) : costo * pct(ganancia.valor)

  if (tasa >= 1) return { valido: false, motivo: 'Los descuentos suman 100 % o más: no hay precio posible.', costo }
  const exacto = (costo + num(envio) + gananciaBuscada) / (1 - tasa)
  const precio = redondeo > 0 ? Math.ceil(exacto / redondeo) * redondeo : Math.round(exacto)
  return {
    valido: true,
    precioExacto: Math.round(exacto),
    ...analizarPrecio({ precio, costo, plataforma, cuotas, medioPago, ivaComision, retenciones, envio }),
  }
}

/** Con un precio ya decidido: cuánto queda de verdad por cada venta. */
export function analizarPrecio({
  precio,
  costo,
  plataforma = 0,
  cuotas = 0,
  medioPago = 0,
  ivaComision = 21,
  retenciones = 0,
  envio = 0,
}) {
  const p = num(precio)
  const c = num(costo)
  const comisionPlataforma = p * pct(plataforma)
  const comisionCuotas = p * pct(cuotas)
  const comisionMedio = p * pct(medioPago)
  const comisiones = comisionPlataforma + comisionCuotas + comisionMedio
  const iva = comisiones * pct(ivaComision)
  const ret = p * pct(retenciones)
  const descuentos = comisiones + iva + ret + num(envio)
  const ganancia = p - c - descuentos
  return {
    precio: p,
    costo: Math.round(c),
    desglose: {
      plataforma: Math.round(comisionPlataforma),
      cuotas: Math.round(comisionCuotas),
      medioPago: Math.round(comisionMedio),
      iva: Math.round(iva),
      retenciones: Math.round(ret),
      envio: Math.round(num(envio)),
    },
    descuentos: Math.round(descuentos),
    ganancia: Math.round(ganancia),
    // Margen: qué parte del precio es ganancia. Markup: cuánto se le suma al costo.
    margen: p > 0 ? ganancia / p : 0,
    markup: c > 0 ? (p - c) / c : 0,
    pierde: ganancia < 0,
  }
}

/**
 * Simulador mensual: con lo que gana cada producto por venta y cuántas se venden, ¿alcanza para los gastos?
 * productos: [{ nombre, ganancia (por unidad), ventas (unidades por mes) }]
 */
export function simularMes({ productos = [], gastosFijos = 0, sueldo = 0 }) {
  const filas = productos.map((p) => ({
    ...p,
    total: Math.round(num(p.ganancia) * num(p.ventas)),
  }))
  const unidades = filas.reduce((s, p) => s + num(p.ventas), 0)
  const gananciaTotal = filas.reduce((s, p) => s + p.total, 0)
  const necesario = num(gastosFijos) + num(sueldo)
  const promedio = unidades > 0 ? gananciaTotal / unidades : 0
  const ventasMinimas = promedio > 0 ? Math.ceil(necesario / promedio) : null
  const resultado = gananciaTotal - necesario
  return {
    filas,
    unidades,
    gananciaTotal,
    necesario,
    gananciaPromedio: Math.round(promedio),
    ventasMinimas,
    resultado,
    rentable: resultado >= 0 && unidades > 0,
  }
}

/**
 * Punto de equilibrio: cuánto hay que vender para cubrir los gastos fijos (más el sueldo del dueño).
 * margenContribucion: proporción del precio que queda después del costo de la mercadería y las comisiones
 * (por ejemplo 0.42). gananciaPorUnidad: lo mismo en pesos por unidad, para hablar en unidades.
 */
export function puntoEquilibrio({ fijos, margenContribucion, gananciaPorUnidad, vendido = 0 }) {
  const f = num(fijos)
  if (!(margenContribucion > 0)) return { posible: false, fijos: f }
  const ventas = Math.ceil(f / margenContribucion)
  return {
    posible: true,
    fijos: f,
    ventas,
    unidades: gananciaPorUnidad > 0 ? Math.ceil(f / gananciaPorUnidad) : null,
    avance: ventas > 0 ? Math.min(num(vendido) / ventas, 9.99) : 1,
    falta: Math.max(ventas - num(vendido), 0),
  }
}

/** Resumen financiero de un período a partir de los totales que arma la base. */
export function resumenPeriodo({ ventas, costoMercaderia, comisiones, unidades, fijos, otrosEgresos = 0 }) {
  const v = num(ventas)
  const contribucion = v - num(costoMercaderia) - num(comisiones)
  const margen = v > 0 ? contribucion / v : 0
  const resultado = contribucion - num(fijos) - num(otrosEgresos)
  return {
    ventas: v,
    costoMercaderia: num(costoMercaderia),
    comisiones: num(comisiones),
    contribucion,
    margenContribucion: margen,
    fijos: num(fijos),
    otrosEgresos: num(otrosEgresos),
    resultado,
    equilibrio: puntoEquilibrio({
      fijos,
      margenContribucion: margen,
      gananciaPorUnidad: num(unidades) > 0 ? contribucion / num(unidades) : 0,
      vendido: v,
    }),
  }
}
