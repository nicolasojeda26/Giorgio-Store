// Reglas del pedido. Son funciones puras (sin base de datos ni red) para poder probarlas solas.
import { cleanCustomer, validateCustomer } from '../../shared/validation.js'

export const MAX_COMBOS = 10

export class OrderError extends Error {
  constructor(code, message, status = 400, extra = {}) {
    super(message)
    this.code = code
    this.status = status
    this.extra = extra
  }
}

/** 1023 -> "GP-001023" */
export const formatOrderNumber = (number) => `GP-${String(number).padStart(6, '0')}`

/**
 * Arma el pedido a partir de lo que manda el navegador y del catálogo de la base de datos.
 * Del navegador solo se toman los datos del cliente y QUÉ eligió; precios, nombres y envío
 * salen siempre de la base, así nadie puede cambiar un precio desde el navegador.
 *
 * catalog: {
 *   promos:   Map(slug -> { slug, title, quantity, price, active, perfumeSlugs: Set }),
 *   perfumes: Map(slug -> { slug, name, size, stock, active }),
 *   shipping: { zone, cost },
 * }
 */
export function buildOrder(payload, catalog) {
  const errors = validateCustomer(payload?.customer)
  if (Object.keys(errors).length > 0) {
    throw new OrderError('datos_invalidos', 'Revisá los datos marcados.', 422, { fields: errors })
  }
  const customer = cleanCustomer(payload.customer)

  const rawItems = payload?.items
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    throw new OrderError('carrito_vacio', 'Tu carrito está vacío.', 400)
  }
  if (rawItems.length > MAX_COMBOS) {
    throw new OrderError('demasiados_combos', `Podés llevar hasta ${MAX_COMBOS} combos por pedido.`, 400)
  }

  const items = rawItems.map((raw) => {
    const promo = catalog.promos.get(String(raw?.promoSlug ?? ''))
    if (!promo || !promo.active) {
      throw new OrderError('promo_no_disponible', 'Una de las promos de tu carrito ya no está disponible.', 409)
    }
    const ids = Array.isArray(raw.perfumeIds) ? raw.perfumeIds.map(String) : []
    if (ids.length !== promo.quantity) {
      throw new OrderError('combo_incompleto', `La promo ${promo.title} lleva ${promo.quantity} perfumes.`, 409)
    }
    const perfumes = ids.map((id) => {
      const perfume = catalog.perfumes.get(id)
      if (!perfume || !perfume.active || !promo.perfumeSlugs.has(id)) {
        throw new OrderError(
          'perfume_no_disponible',
          `Un perfume de la promo ${promo.title} ya no está disponible.`,
          409,
        )
      }
      if (!perfume.stock) {
        throw new OrderError('sin_stock', `${perfume.name} se quedó sin stock. Elegí otro para tu combo.`, 409)
      }
      return { slug: perfume.slug, name: perfume.name, size: perfume.size }
    })
    return { promo_slug: promo.slug, promo_title: promo.title, unit_price: promo.price, perfumes }
  })

  const subtotal = items.reduce((sum, item) => sum + item.unit_price, 0)
  const shippingCost = catalog.shipping.cost
  return { customer, city: catalog.shipping.zone, items, subtotal, shippingCost, total: subtotal + shippingCost }
}

/** Fila para insertar en la tabla orders. */
export const toOrderRow = (order) => ({
  customer_name: order.customer.name,
  customer_phone: order.customer.phone,
  customer_email: order.customer.email,
  address: order.customer.address,
  address_notes: order.customer.notes,
  city: order.city,
  items: order.items,
  subtotal: order.subtotal,
  shipping_cost: order.shippingCost,
  total: order.total,
})

/**
 * Qué cambia en el pedido cuando Mercado Pago informa un pago.
 * Devuelve los campos a actualizar, o null si el aviso no corresponde a este pedido.
 */
export function paymentUpdate(order, payment, now = new Date()) {
  if (String(payment?.external_reference ?? '') !== order.id) return null
  const paymentId = String(payment.id)

  // Un pedido ya pagado solo acepta novedades de ESE pago (por ejemplo, una devolución).
  if (order.status !== 'pendiente') {
    return order.mp_payment_id === paymentId && order.payment_status !== payment.status
      ? { payment_status: payment.status }
      : null
  }

  if (payment.status !== 'approved') return { mp_payment_id: paymentId, payment_status: payment.status }

  const amountOk = payment.currency_id === 'ARS' && Number(payment.transaction_amount) >= order.total
  if (!amountOk) return { mp_payment_id: paymentId, payment_status: 'monto_no_coincide' }

  return { mp_payment_id: paymentId, payment_status: 'approved', status: 'pagado', paid_at: now.toISOString() }
}

/** Lo que se le puede mostrar al comprador en la página del pedido (sin datos internos). */
export function publicOrder(order, { emailEnabled = false } = {}) {
  const failed = ['rejected', 'cancelled', 'monto_no_coincide'].includes(order.payment_status)
  return {
    number: formatOrderNumber(order.number),
    status: order.status,
    paymentStatus: order.payment_status,
    paymentFailed: order.status === 'pendiente' && failed,
    retryUrl: order.status === 'pendiente' ? order.mp_init_point : null,
    items: order.items,
    subtotal: order.subtotal,
    shippingCost: order.shipping_cost,
    total: order.total,
    customer: { name: order.customer_name, email: order.customer_email, address: order.address, city: order.city },
    emailEnabled,
  }
}
