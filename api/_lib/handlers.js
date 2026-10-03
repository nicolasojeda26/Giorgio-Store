// Lógica de las tres funciones de /api. Reciben sus dependencias (base, Mercado Pago, emails)
// por parámetro: en producción las arma deps.js y en los tests se reemplazan por dobles.
import { isConfigured } from './config.js'
import { errorJson, isUuid, json, readJson } from './http.js'
import { OrderError, buildOrder, formatOrderNumber, paymentUpdate, publicOrder, toOrderRow } from './orders.js'
import { preferenceFor, verifyWebhookSignature } from './mercadopago.js'
import { emailEnabled } from './email.js'

const NOT_CONFIGURED = () =>
  errorJson('sin_configurar', 'El pago online todavía no está habilitado. Probá de nuevo más tarde.', 503)

const siteUrlFor = (request, config) => config.siteUrl || new URL(request.url).origin

/** POST /api/checkout  { customer, items: [{ promoSlug, perfumeIds }] } */
export async function handleCheckout(request, deps) {
  const { config, db, mp } = deps
  if (!isConfigured(config)) return NOT_CONFIGURED()

  const body = await readJson(request)
  if (!body) return errorJson('pedido_invalido', 'No pudimos leer el pedido. Probá de nuevo.', 400)
  // Campo trampa: las personas no lo ven; si viene completo es un bot y no se crea nada.
  if (body.website) return json({ ok: true })

  let order
  try {
    const items = Array.isArray(body.items) ? body.items : []
    const catalog = await db.loadCatalog({
      promoSlugs: [...new Set(items.map((i) => String(i?.promoSlug ?? '')))].slice(0, 50),
      perfumeSlugs: [
        ...new Set(items.flatMap((i) => (Array.isArray(i?.perfumeIds) ? i.perfumeIds.map(String) : []))),
      ].slice(0, 200),
    })
    order = await db.insertOrder(toOrderRow(buildOrder(body, catalog)))
  } catch (error) {
    if (error instanceof OrderError) return errorJson(error.code, error.message, error.status, error.extra)
    console.error('[checkout] pedido', error)
    return errorJson('error_interno', 'No pudimos crear tu pedido. Probá de nuevo en unos minutos.', 500)
  }

  try {
    const preference = await mp.createPreference(
      preferenceFor(order, { siteUrl: siteUrlFor(request, config) }),
      order.id,
    )
    await db.updateOrder(order.id, { mp_preference_id: preference.id, mp_init_point: preference.init_point })
    return json({
      orderId: order.id,
      token: order.access_token,
      number: formatOrderNumber(order.number),
      initPoint: preference.init_point,
    })
  } catch (error) {
    console.error('[checkout] mercado pago', error.status ?? '', error.body ?? error)
    await db.updateOrder(order.id, { status: 'cancelado', payment_status: 'error_preferencia' }).catch(() => {})
    return errorJson('error_pago', 'No pudimos conectar con Mercado Pago. Probá de nuevo en unos minutos.', 502)
  }
}

/**
 * Consulta el pago en Mercado Pago y actualiza el pedido. La usan el webhook y la página del pedido.
 * Nunca se confía en lo que dice el aviso: el estado se lee siempre de la API de Mercado Pago.
 */
export async function syncPayment(paymentId, deps, { expectOrderId } = {}) {
  const { db, mp, sendEmails, now = () => new Date() } = deps
  const payment = await mp.getPayment(paymentId)
  const orderId = payment?.external_reference
  if (!isUuid(orderId) || (expectOrderId && orderId !== expectOrderId)) return null

  const order = await db.getOrder(orderId)
  if (!order) return null

  const patch = paymentUpdate(order, payment, now())
  if (!patch) return order

  const updated = await db.updateOrder(order.id, patch)
  if (patch.status === 'pagado' && (await db.claimEmails(order.id))) {
    await sendEmails(updated).catch((error) => console.error('[email]', error))
  }
  return updated
}

/** GET /api/order?id=...&token=...[&payment_id=...] */
export async function handleOrder(request, deps) {
  const { config, db } = deps
  if (!isConfigured(config)) return NOT_CONFIGURED()

  const params = new URL(request.url).searchParams
  const id = params.get('id')
  const token = params.get('token')
  const notFound = () => errorJson('pedido_no_encontrado', 'No encontramos ese pedido.', 404)
  if (!isUuid(id) || !isUuid(token)) return notFound()

  try {
    let order = await db.getOrder(id)
    if (!order || order.access_token !== token) return notFound()

    // Al volver de Mercado Pago puede que el webhook todavía no haya llegado: se consulta el pago acá.
    const paymentId = params.get('payment_id')
    if (order.status === 'pendiente' && /^\d{1,20}$/.test(paymentId ?? '')) {
      order = (await syncPayment(paymentId, deps, { expectOrderId: id }).catch(() => null)) ?? order
    }
    return json(publicOrder(order, { emailEnabled: emailEnabled(config) }))
  } catch (error) {
    console.error('[order]', error)
    return errorJson('error_interno', 'No pudimos consultar el pedido. Probá de nuevo.', 500)
  }
}

/** POST /api/mp-webhook?data.id=...&type=payment  (aviso de Mercado Pago) */
export async function handleWebhook(request, deps) {
  const { config } = deps
  if (!isConfigured(config)) return NOT_CONFIGURED()

  const params = new URL(request.url).searchParams
  const body = (await readJson(request)) ?? {}
  const type = params.get('type') ?? params.get('topic') ?? body.type
  const dataId = params.get('data.id') ?? params.get('id') ?? body.data?.id

  if (config.mpWebhookSecret) {
    const valid = verifyWebhookSignature({
      signature: request.headers.get('x-signature'),
      requestId: request.headers.get('x-request-id'),
      dataId: params.get('data.id'),
      secret: config.mpWebhookSecret,
    })
    if (!valid) return errorJson('firma_invalida', 'Firma inválida.', 401)
  }

  // Solo interesan los pagos; el resto se responde OK para que Mercado Pago no reintente.
  if (type !== 'payment' || !/^\d{1,20}$/.test(String(dataId ?? ''))) return json({ ok: true, ignored: true })

  try {
    await syncPayment(String(dataId), deps)
    return json({ ok: true })
  } catch (error) {
    console.error('[webhook]', error.status ?? '', error.body ?? error)
    // 500: Mercado Pago vuelve a avisar más tarde.
    return errorJson('error_interno', 'No se pudo procesar el aviso.', 500)
  }
}
