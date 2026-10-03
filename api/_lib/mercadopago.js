// Cliente mínimo de Mercado Pago (Checkout Pro) sobre fetch, sin SDK.
import { createHmac, timingSafeEqual } from 'node:crypto'

const API = 'https://api.mercadopago.com'

export class MpError extends Error {
  constructor(status, body) {
    super(`Mercado Pago respondió ${status}`)
    this.status = status
    this.body = body
  }
}

export function makeMp({ accessToken, fetchImpl = fetch }) {
  const call = async (path, init = {}) => {
    const response = await fetchImpl(`${API}${path}`, {
      ...init,
      headers: { authorization: `Bearer ${accessToken}`, 'content-type': 'application/json', ...init.headers },
    })
    const body = await response.json().catch(() => null)
    if (!response.ok) throw new MpError(response.status, body)
    return body
  }

  return {
    /** Crea la preferencia de pago. idempotencyKey evita duplicarla si se reintenta. */
    createPreference: (preference, idempotencyKey) =>
      call('/checkout/preferences', {
        method: 'POST',
        headers: { 'x-idempotency-key': idempotencyKey },
        body: JSON.stringify(preference),
      }),
    getPayment: (id) => call(`/v1/payments/${encodeURIComponent(id)}`),
  }
}

/** Cuerpo de la preferencia para un pedido ya guardado (fila de la tabla orders). */
export function preferenceFor(order, { siteUrl }) {
  const returnUrl = `${siteUrl}/pedido/${order.id}/${order.access_token}`
  const https = siteUrl.startsWith('https://')

  return {
    items: [
      ...order.items.map((item) => ({
        id: item.promo_slug,
        title: `Promo ${item.promo_title}`,
        description: item.perfumes
          .map((p) => p.name)
          .join(', ')
          .slice(0, 250),
        quantity: 1,
        currency_id: 'ARS',
        unit_price: item.unit_price,
      })),
      ...(order.shipping_cost > 0
        ? [
            {
              id: 'envio',
              title: `Envío a domicilio (${order.city})`,
              quantity: 1,
              currency_id: 'ARS',
              unit_price: order.shipping_cost,
            },
          ]
        : []),
    ],
    payer: { name: order.customer_name, email: order.customer_email },
    external_reference: order.id,
    back_urls: { success: returnUrl, pending: returnUrl, failure: returnUrl },
    // Mercado Pago solo acepta la vuelta automática y el webhook con URLs https (no en localhost).
    ...(https ? { auto_return: 'approved', notification_url: `${siteUrl}/api/mp-webhook` } : {}),
    // Solo tarjetas: se excluyen efectivo (ticket), cajero (atm) y transferencia.
    // El dinero en cuenta de Mercado Pago no se puede excluir.
    payment_methods: { excluded_payment_types: [{ id: 'ticket' }, { id: 'atm' }, { id: 'bank_transfer' }] },
    statement_descriptor: 'GIORGIO PERFUMERIA',
    metadata: { order_number: order.number },
  }
}

/**
 * Valida la firma de un webhook (header x-signature: "ts=...,v1=...").
 * El texto firmado es "id:<data.id>;request-id:<x-request-id>;ts:<ts>;", con el id en minúsculas;
 * si falta el id o el request-id, esa parte no va.
 */
export function verifyWebhookSignature({ signature, requestId, dataId, secret }) {
  if (!signature || !secret) return false
  const parts = Object.fromEntries(
    signature
      .split(',')
      .map((part) => part.split('=').map((s) => s.trim()))
      .filter((pair) => pair.length === 2),
  )
  if (!parts.ts || !parts.v1) return false

  const manifest =
    (dataId ? `id:${String(dataId).toLowerCase()};` : '') +
    (requestId ? `request-id:${requestId};` : '') +
    `ts:${parts.ts};`
  const expected = createHmac('sha256', secret).update(manifest).digest('hex')

  const a = Buffer.from(expected)
  const b = Buffer.from(parts.v1)
  return a.length === b.length && timingSafeEqual(a, b)
}
