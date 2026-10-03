const ars = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 })

/** 50000 -> "$50.000" */
export const money = (value) => `$${ars.format(value)}`
