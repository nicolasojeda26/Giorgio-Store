import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createHmac } from 'node:crypto'
import { makeMp, preferenceFor, verifyWebhookSignature } from '../api/_lib/mercadopago.js'

const secret = 'clave-webhook'
const sign = (manifest) => createHmac('sha256', secret).update(manifest).digest('hex')

test('acepta una firma válida de webhook', () => {
  const v1 = sign('id:123456;request-id:req-1;ts:1700000000;')
  assert.ok(
    verifyWebhookSignature({ signature: `ts=1700000000,v1=${v1}`, requestId: 'req-1', dataId: '123456', secret }),
  )
})

test('el id se firma en minúsculas', () => {
  const v1 = sign('id:ord01abc;request-id:req-1;ts:1;')
  assert.ok(verifyWebhookSignature({ signature: `ts=1, v1=${v1}`, requestId: 'req-1', dataId: 'ORD01ABC', secret }))
})

test('rechaza firmas alteradas, de otro pago o sin clave', () => {
  const v1 = sign('id:123456;request-id:req-1;ts:1700000000;')
  const signature = `ts=1700000000,v1=${v1}`
  assert.equal(verifyWebhookSignature({ signature, requestId: 'req-1', dataId: '999', secret }), false)
  assert.equal(verifyWebhookSignature({ signature, requestId: 'req-2', dataId: '123456', secret }), false)
  assert.equal(verifyWebhookSignature({ signature, requestId: 'req-1', dataId: '123456', secret: 'otra' }), false)
  assert.equal(
    verifyWebhookSignature({ signature: 'ts=1700000000,v1=abc', requestId: 'req-1', dataId: '123456', secret }),
    false,
  )
  assert.equal(verifyWebhookSignature({ signature: null, requestId: 'req-1', dataId: '123456', secret }), false)
  assert.equal(verifyWebhookSignature({ signature, requestId: 'req-1', dataId: '123456', secret: '' }), false)
})

const order = {
  id: '11111111-1111-4111-8111-111111111111',
  access_token: '22222222-2222-4222-8222-222222222222',
  number: 1001,
  customer_name: 'Juana Pérez',
  customer_email: 'juana@mail.com',
  city: 'Corrientes Capital',
  shipping_cost: 3000,
  total: 53000,
  items: [
    {
      promo_slug: 'duo',
      promo_title: '2 perfumes 100 ml',
      unit_price: 50000,
      perfumes: [{ name: 'A' }, { name: 'B' }],
    },
  ],
}

test('la preferencia cobra exactamente el total del pedido y solo con tarjeta', () => {
  const pref = preferenceFor(order, { siteUrl: 'https://giorgio.test' })
  assert.equal(
    pref.items.reduce((sum, i) => sum + i.unit_price * i.quantity, 0),
    order.total,
  )
  assert.ok(pref.items.every((i) => i.currency_id === 'ARS'))
  assert.equal(pref.external_reference, order.id)
  assert.equal(pref.back_urls.success, `https://giorgio.test/pedido/${order.id}/${order.access_token}`)
  assert.equal(pref.auto_return, 'approved')
  assert.equal(pref.notification_url, 'https://giorgio.test/api/mp-webhook')
  assert.deepEqual(
    pref.payment_methods.excluded_payment_types.map((t) => t.id),
    ['ticket', 'atm', 'bank_transfer'],
  )
})

test('en localhost no pide vuelta automática ni webhook', () => {
  const pref = preferenceFor(order, { siteUrl: 'http://localhost:3000' })
  assert.equal(pref.auto_return, undefined)
  assert.equal(pref.notification_url, undefined)
})

test('el cliente manda el token y la clave de idempotencia, y avisa los errores', async () => {
  const calls = []
  const fetchImpl = async (url, init) => {
    calls.push({ url, init })
    return calls.length === 1
      ? new Response(JSON.stringify({ id: 'pref-1', init_point: 'https://mp/1' }), { status: 201 })
      : new Response(JSON.stringify({ message: 'invalid' }), { status: 400 })
  }
  const mp = makeMp({ accessToken: 'TEST-abc', fetchImpl })
  const pref = await mp.createPreference({ items: [] }, 'pedido-1')
  assert.equal(pref.init_point, 'https://mp/1')
  assert.equal(calls[0].url, 'https://api.mercadopago.com/checkout/preferences')
  assert.equal(calls[0].init.headers.authorization, 'Bearer TEST-abc')
  assert.equal(calls[0].init.headers['x-idempotency-key'], 'pedido-1')
  await assert.rejects(
    () => mp.getPayment('5'),
    (error) => error.status === 400,
  )
})
