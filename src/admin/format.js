const ars = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 })
export const money = (value) => `$${ars.format(value)}`

/** 1023 -> "GP-001023" */
export const orderNumber = (number) => `GP-${String(number).padStart(6, '0')}`

const dayTime = new Intl.DateTimeFormat('es-AR', {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})
const time = new Intl.DateTimeFormat('es-AR', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })

/** "hoy 14:32", "ayer 09:10" o "2 oct, 18:45" */
export function when(iso) {
  const date = new Date(iso)
  const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  const days = Math.round((startOfDay(new Date()) - startOfDay(date)) / 86_400_000)
  if (days === 0) return `hoy ${time.format(date)}`
  if (days === 1) return `ayer ${time.format(date)}`
  return dayTime.format(date)
}

export const GENDERS = [
  { value: 'hombre', label: 'Hombre' },
  { value: 'mujer', label: 'Mujer' },
  { value: 'unisex', label: 'Unisex' },
]
export const GENDER_LABEL = Object.fromEntries(GENDERS.map((g) => [g.value, g.label]))
