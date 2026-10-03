// Flujo completo contra una base Postgres real (PGlite) con el esquema del proyecto:
// checkout -> pedido pendiente -> aviso de Mercado Pago -> pedido pagado -> emails.
import { test, before } from 'node:test'
import assert from 'node:assert/strict'
import { createHmac } from 'node:crypto'
import { handleCheckout, handleOrder, handleWebhook } from '../api/_lib/handlers.js'
import { CONFIG, CUSTOMER, createDatabase, get, makeFakeMp, makeTestDb, post } from './helpers.js'

let pg, deps, mp, emails

before(async () => {
  pg = await createDatabase()
})

const setup = (config = {}) => {
  mp = makeFakeMp()
  emails = []
  deps = {
    config: { ...CONFIG, ...config },
    db: makeTestDb(pg),
    mp,
    sendEmails: async (order) => emails.push(order.number),
  }
}

const COMBO = { promoSlug: '2-perfumes-100-ml', perfumeIds: ['noche-de-ambar', 'flor-de-sal'] }
const checkout = async (body) => {
  const response = await handleCheckout(post('/api/checkout', body), deps)
  return { status: response.status, body: await response.json() }
}
const approve = (order, paymentId, extra = {}) =>
  mp.payments.set(String(paymentId), {
    id: paymentId,
    external_reference: order.orderId,
    status: 'approved',
    transaction_amount: 53000,
    currency_id: 'ARS',
    ...extra,
  })

test('el esquema y los datos de ejemplo se pueden ejecutar dos veces', async () => {
  const again = await createDatabase()
  const { readFileSync } = await import('node:fs')
  for (const file of ['schema.sql', 'seed.sql']) {
    await again.exec(readFileSync(new URL(`../supabase/${file}`, import.meta.url), 'utf8'))
  }
  const count = async (table) => Number((await again.query(`select count(*) from ${table}`)).rows[0].count)
  assert.equal(await count('promos'), 4)
  assert.equal(await count('perfumes'), 26)
  assert.equal(await count('promo_perfumes'), 34)
  assert.equal(await count('settings'), 1)
})

test('la clave pública solo lee el catálogo activo y no ve ni crea pedidos', async () => {
  const db = await createDatabase()
  await db.exec("update promos set active = false where slug = 'decants-3'")
  await db.exec(`insert into orders (customer_name, customer_phone, customer_email, address, city, items, subtotal, shipping_cost, total)
                 values ('a', 'b', 'c', 'd', 'e', '[]', 1, 1, 2)`)
  await db.exec('set role anon')
  assert.equal((await db.query('select slug from promos')).rows.length, 3)
  assert.equal((await db.query('select slug from perfumes')).rows.length, 26)
  assert.equal((await db.query('select * from orders')).rows.length, 0)
  await assert.rejects(
    db.query(`insert into orders (customer_name, customer_phone, customer_email, address, city, items, subtotal, shipping_cost, total)
              values ('a', 'b', 'c', 'd', 'e', '[]', 1, 1, 2)`),
    /row-level security|permission denied/,
  )
  assert.equal((await db.query("update promos set price = 1 where slug = '5-arabes' returning slug")).rows.length, 0)
  await db.exec('reset role')
})

test('checkout: crea el pedido pendiente con los precios de la base y el link de pago', async () => {
  setup()
  const { status, body } = await checkout({ customer: CUSTOMER, items: [{ ...COMBO, price: 1 }] })
  assert.equal(status, 200)
  assert.match(body.number, /^GP-00\d{4}$/)
  assert.equal(body.initPoint, 'https://mp.test/pagar/1')

  const order = await deps.db.getOrder(body.orderId)
  assert.equal(order.status, 'pendiente')
  assert.equal(order.total, 53000)
  assert.equal(order.customer_email, 'juana@mail.com')
  assert.equal(order.mp_init_point, body.initPoint)
  assert.deepEqual(
    order.items[0].perfumes.map((p) => p.name),
    ['Noche de Ámbar', 'Flor de Sal'],
  )
  assert.equal(mp.preferences[0].idempotencyKey, order.id)
  assert.equal(
    mp.preferences[0].preference.items.reduce((s, i) => s + i.unit_price, 0),
    53000,
  )
})

test('checkout: devuelve errores claros y no crea pedidos inválidos', async () => {
  setup()
  const before = (await pg.query('select count(*) from orders')).rows[0].count
  const noStock = await checkout({
    customer: CUSTOMER,
    items: [{ promoSlug: '2-perfumes-100-ml', perfumeIds: ['verde-urbano', 'flor-de-sal'] }],
  })
  assert.deepEqual([noStock.status, noStock.body.error.code], [409, 'sin_stock'])
  const wrongPromo = await checkout({
    customer: CUSTOMER,
    items: [{ promoSlug: '2-perfumes-100-ml', perfumeIds: ['oud-del-desierto', 'flor-de-sal'] }],
  })
  assert.deepEqual([wrongPromo.status, wrongPromo.body.error.code], [409, 'perfume_no_disponible'])
  const badData = await checkout({ customer: { ...CUSTOMER, phone: '1' }, items: [COMBO] })
  assert.deepEqual([badData.status, Object.keys(badData.body.error.fields)], [422, ['phone']])
  const empty = await checkout({ customer: CUSTOMER, items: [] })
  assert.equal(empty.body.error.code, 'carrito_vacio')
  const garbage = await handleCheckout(
    new Request('https://giorgio.test/api/checkout', { method: 'POST', body: 'no es json' }),
    deps,
  )
  assert.equal(garbage.status, 400)
  const bot = await checkout({ customer: CUSTOMER, items: [COMBO], website: 'http://spam' })
  assert.deepEqual([bot.status, bot.body.initPoint], [200, undefined])
  assert.equal((await pg.query('select count(*) from orders')).rows[0].count, before)
  assert.equal(mp.preferences.length, 0)
})

test('checkout: si Mercado Pago falla, avisa y cancela el pedido', async () => {
  setup()
  mp.failNext = true
  const { status, body } = await checkout({ customer: CUSTOMER, items: [COMBO] })
  assert.deepEqual([status, body.error.code], [502, 'error_pago'])
  const last = (
    await pg.query('select status, payment_status from orders order by created_at desc, number desc limit 1')
  ).rows[0]
  assert.deepEqual(last, { status: 'cancelado', payment_status: 'error_preferencia' })
})

test('sin claves configuradas responde 503 y no toca nada', async () => {
  const response = await handleCheckout(post('/api/checkout', { customer: CUSTOMER, items: [COMBO] }), {
    config: { ...CONFIG, mpAccessToken: '' },
  })
  assert.equal(response.status, 503)
})

test('webhook: un pago aprobado marca el pedido como pagado y manda los emails una sola vez', async () => {
  setup()
  const { body: created } = await checkout({ customer: CUSTOMER, items: [COMBO] })
  approve(created, 9001)

  const hook = () =>
    handleWebhook(post('/api/mp-webhook?data.id=9001&type=payment', { type: 'payment', data: { id: '9001' } }), deps)
  assert.equal((await hook()).status, 200)
  const order = await deps.db.getOrder(created.orderId)
  assert.equal(order.status, 'pagado')
  assert.equal(order.mp_payment_id, '9001')
  assert.ok(order.paid_at)
  assert.equal(emails.length, 1)

  assert.equal((await hook()).status, 200) // Mercado Pago repite avisos: no cambia nada
  assert.equal(emails.length, 1)
})

test('webhook: no se puede marcar pagado con un aviso inventado ni con un monto menor', async () => {
  setup()
  const { body: created } = await checkout({ customer: CUSTOMER, items: [COMBO] })

  // Aviso de un pago que no existe en Mercado Pago: error para que reintente, pedido intacto.
  const fake = await handleWebhook(post('/api/mp-webhook?data.id=4242&type=payment', {}), deps)
  assert.equal(fake.status, 500)
  assert.equal((await deps.db.getOrder(created.orderId)).status, 'pendiente')

  approve(created, 9002, { transaction_amount: 10 })
  await handleWebhook(post('/api/mp-webhook?data.id=9002&type=payment', {}), deps)
  const order = await deps.db.getOrder(created.orderId)
  assert.deepEqual([order.status, order.payment_status], ['pendiente', 'monto_no_coincide'])
  assert.equal(emails.length, 0)

  const other = await handleWebhook(post('/api/mp-webhook?id=1&topic=merchant_order', {}), deps)
  assert.deepEqual(await other.json(), { ok: true, ignored: true })
})

test('webhook: con clave configurada exige la firma de Mercado Pago', async () => {
  setup({ mpWebhookSecret: 'clave' })
  const { body: created } = await checkout({ customer: CUSTOMER, items: [COMBO] })
  approve(created, 9003)
  const url = '/api/mp-webhook?data.id=9003&type=payment'

  assert.equal((await handleWebhook(post(url, {}), deps)).status, 401)
  assert.equal(
    (await handleWebhook(post(url, {}, { 'x-signature': 'ts=1,v1=mala', 'x-request-id': 'r1' }), deps)).status,
    401,
  )
  assert.equal((await deps.db.getOrder(created.orderId)).status, 'pendiente')

  const v1 = createHmac('sha256', 'clave').update('id:9003;request-id:r1;ts:1;').digest('hex')
  assert.equal(
    (await handleWebhook(post(url, {}, { 'x-signature': `ts=1,v1=${v1}`, 'x-request-id': 'r1' }), deps)).status,
    200,
  )
  assert.equal((await deps.db.getOrder(created.orderId)).status, 'pagado')
})

test('página del pedido: exige el token y confirma el pago al volver de Mercado Pago', async () => {
  setup()
  const { body: created } = await checkout({ customer: CUSTOMER, items: [COMBO] })
  const url = (token, extra = '') => `/api/order?id=${created.orderId}&token=${token}${extra}`

  assert.equal((await handleOrder(get(url('33333333-3333-4333-8333-333333333333')), deps)).status, 404)
  assert.equal((await handleOrder(get('/api/order?id=1&token=2'), deps)).status, 404)

  const pending = await (await handleOrder(get(url(created.token)), deps)).json()
  assert.deepEqual([pending.status, pending.retryUrl, pending.total], ['pendiente', 'https://mp.test/pagar/1', 53000])

  // Vuelve de Mercado Pago antes de que llegue el webhook.
  approve(created, 9004)
  const paid = await (await handleOrder(get(url(created.token, '&payment_id=9004')), deps)).json()
  assert.deepEqual([paid.status, paid.retryUrl, paid.number], ['pagado', null, created.number])
  assert.equal(emails.length, 1)

  // El payment_id de otro pedido no sirve para marcar este.
  const { body: second } = await checkout({ customer: CUSTOMER, items: [COMBO] })
  const stolen = await (
    await handleOrder(get(`/api/order?id=${second.orderId}&token=${second.token}&payment_id=9004`), deps)
  ).json()
  assert.equal(stolen.status, 'pendiente')
})
