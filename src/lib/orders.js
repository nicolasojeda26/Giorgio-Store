// Pedidos desde el navegador: crear el pedido (y obtener el link de pago) y consultar su estado.
import { BACKEND_ENABLED } from './backend.js'
import { addDemoOrder } from './demoDb.js'

/** 1023 -> "GP-001023" */
export const formatNumber = (number) => `GP-${String(number).padStart(6, '0')}`

const DEMO_KEY = 'giorgio:pedido-prueba'

export class CheckoutError extends Error {
  constructor({ code = 'error', message, fields } = {}) {
    super(message ?? 'No pudimos procesar tu pedido. Probá de nuevo.')
    this.code = code
    this.fields = fields
  }
}

const NETWORK = { code: 'error_red', message: 'No pudimos conectar. Revisá tu conexión y probá de nuevo.' }

async function request(url, init) {
  let response
  try {
    response = await fetch(url, init)
  } catch {
    throw new CheckoutError(NETWORK)
  }
  const data = await response.json().catch(() => null)
  if (!response.ok) throw new CheckoutError(data?.error ?? NETWORK)
  return data
}

/**
 * Crea el pedido. Con backend devuelve { initPoint } para ir a pagar a Mercado Pago.
 * En modo de prueba arma un pedido local (sin cobro) y devuelve { demo: true }.
 *
 * `preview` es el pedido tal como lo ve el comprador; solo se usa en modo de prueba.
 */
export async function createOrder({ customer, items, website, preview }) {
  if (!BACKEND_ENABLED) {
    await new Promise((resolve) => setTimeout(resolve, 700)) // imita la espera del pedido real
    // El pedido de prueba también aparece en el panel de administración.
    const saved = addDemoOrder({ ...preview, customer, city: preview.customer.city })
    try {
      sessionStorage.setItem(DEMO_KEY, JSON.stringify({ ...preview, number: formatNumber(saved.number) }))
    } catch {
      /* sin almacenamiento: la página del pedido lo avisa */
    }
    return { demo: true }
  }

  const data = await request('/api/checkout', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      customer,
      items: items.map(({ promoSlug, perfumeIds }) => ({ promoSlug, perfumeIds })),
      website,
    }),
  })
  if (!data?.initPoint) throw new CheckoutError()
  return data
}

/** Estado de un pedido para la página de confirmación. */
export async function fetchOrder({ id, token, paymentId }) {
  if (id === 'prueba') {
    try {
      return JSON.parse(sessionStorage.getItem(DEMO_KEY))
    } catch {
      return null
    }
  }
  const params = new URLSearchParams({ id, token: token ?? '' })
  if (paymentId) params.set('payment_id', paymentId)
  return request(`/api/order?${params}`)
}
