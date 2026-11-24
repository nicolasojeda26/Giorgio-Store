const ars = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 })
const ars1 = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 1 })

/** 1234567 -> "$1.234.567"; negativos con signo adelante. */
export const money = (value) => `${value < 0 ? '−' : ''}$${ars.format(Math.abs(Math.round(Number(value) || 0)))}`
/** 0.4231 -> "42,3 %" */
export const percent = (ratio) => `${ars1.format((Number(ratio) || 0) * 100)} %`
export const number = (value) => ars.format(Number(value) || 0)
const ars3 = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 3 })
/** 6.29 -> "6,29" (porcentajes cargados a mano, con sus decimales). */
export const decimal = (value) => ars3.format(Number(value) || 0)

const TZ = 'America/Argentina/Buenos_Aires'
/** Fecha de hoy en Argentina, "2026-11-24". */
export const today = () => new Date().toLocaleDateString('sv-SE', { timeZone: TZ })
export const thisMonth = () => today().slice(0, 7)

const dayFmt = new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'short', timeZone: 'UTC' })
const monthFmt = new Intl.DateTimeFormat('es-AR', { month: 'long', year: 'numeric', timeZone: 'UTC' })
/** "2026-11-24" -> "24 nov" */
export const day = (iso) => dayFmt.format(new Date(`${String(iso).slice(0, 10)}T12:00:00Z`))
/** "2026-11" -> "noviembre de 2026" */
export const monthName = (ym) => monthFmt.format(new Date(`${ym}-15T12:00:00Z`))
/** "2026-11" -> "Noviembre de 2026" */
export const monthTitle = (ym) => {
  const name = monthName(ym)
  return name.charAt(0).toUpperCase() + name.slice(1)
}
export const shiftMonth = (ym, delta) => {
  const [y, m] = ym.split('-').map(Number)
  const d = new Date(Date.UTC(y, m - 1 + delta, 1))
  return d.toISOString().slice(0, 7)
}

export const CUENTAS = { efectivo: 'Efectivo', banco: 'Banco', mercado_pago: 'Mercado Pago' }
export const CATEGORIAS = {
  venta: 'Venta',
  aporte: 'Aporte del dueño',
  otro_ingreso: 'Otro ingreso',
  gasto_fijo: 'Gasto fijo',
  gasto_variable: 'Gasto variable',
  pago_proveedor: 'Pago a proveedor',
  retiro: 'Retiro del dueño',
  otro_egreso: 'Otro egreso',
}
