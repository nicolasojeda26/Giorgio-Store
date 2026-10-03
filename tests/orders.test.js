import { test } from 'node:test'
import assert from 'node:assert/strict'
import { OrderError, buildOrder, formatOrderNumber, paymentUpdate, publicOrder } from '../api/_lib/orders.js'
import { validateCustomer } from '../shared/validation.js'
import { CUSTOMER } from './helpers.js'

const catalog = () => ({
  promos: new Map([
    [
      'duo',
      {
        slug: 'duo',
        title: '2 perfumes 100 ml',
        quantity: 2,
        price: 50000,
        active: true,
        perfumeSlugs: new Set(['a', 'b', 'agotado']),
      },
    ],
    [
      'vieja',
      { slug: 'vieja', title: 'Promo vieja', quantity: 1, price: 100, active: false, perfumeSlugs: new Set(['a']) },
    ],
  ]),
  perfumes: new Map([
    ['a', { slug: 'a', name: 'Perfume A', size: '100 ml', stock: true, active: true }],
    ['b', { slug: 'b', name: 'Perfume B', size: '100 ml', stock: true, active: true }],
    ['agotado', { slug: 'agotado', name: 'Perfume Agotado', size: '100 ml', stock: false, active: true }],
    ['otro', { slug: 'otro', name: 'De otra promo', size: '50 ml', stock: true, active: true }],
  ]),
  shipping: { zone: 'Corrientes Capital', cost: 3000 },
})

const order = (items, customer = CUSTOMER) => buildOrder({ customer, items }, catalog())
const rejects = (fn, code) => assert.throws(fn, (error) => error instanceof OrderError && error.code === code)

test('arma el pedido con precios y nombres de la base', () => {
  const result = order([{ promoSlug: 'duo', perfumeIds: ['a', 'b'] }])
  assert.equal(result.subtotal, 50000)
  assert.equal(result.shippingCost, 3000)
  assert.equal(result.total, 53000)
  assert.deepEqual(
    result.items[0].perfumes.map((p) => p.name),
    ['Perfume A', 'Perfume B'],
  )
  assert.equal(result.customer.email, 'juana@mail.com')
})

test('ignora cualquier precio que mande el navegador', () => {
  const result = order([{ promoSlug: 'duo', perfumeIds: ['a', 'a'], price: 1, unit_price: 1 }])
  assert.equal(result.total, 53000)
})

test('permite repetir el mismo perfume y sumar varios combos', () => {
  const combo = { promoSlug: 'duo', perfumeIds: ['a', 'a'] }
  assert.equal(order([combo, combo]).total, 103000)
})

test('rechaza carritos inválidos', () => {
  rejects(() => order([]), 'carrito_vacio')
  rejects(() => order(Array(11).fill({ promoSlug: 'duo', perfumeIds: ['a', 'b'] })), 'demasiados_combos')
  rejects(() => order([{ promoSlug: 'no-existe', perfumeIds: ['a'] }]), 'promo_no_disponible')
  rejects(() => order([{ promoSlug: 'vieja', perfumeIds: ['a'] }]), 'promo_no_disponible')
  rejects(() => order([{ promoSlug: 'duo', perfumeIds: ['a'] }]), 'combo_incompleto')
  rejects(() => order([{ promoSlug: 'duo', perfumeIds: ['a', 'b', 'a'] }]), 'combo_incompleto')
  rejects(() => order([{ promoSlug: 'duo', perfumeIds: ['a', 'otro'] }]), 'perfume_no_disponible')
  rejects(() => order([{ promoSlug: 'duo', perfumeIds: ['a', 'agotado'] }]), 'sin_stock')
  rejects(() => order([{ promoSlug: 'duo' }]), 'combo_incompleto')
})

test('valida los datos del comprador', () => {
  assert.deepEqual(validateCustomer(CUSTOMER), {})
  assert.deepEqual(Object.keys(validateCustomer({})).sort(), ['address', 'email', 'name', 'phone'])
  assert.ok(validateCustomer({ ...CUSTOMER, email: 'juana@mail' }).email)
  assert.ok(validateCustomer({ ...CUSTOMER, phone: '123' }).phone)
  assert.ok(validateCustomer({ ...CUSTOMER, address: 'Sin altura' }).address)
  assert.throws(
    () => order([{ promoSlug: 'duo', perfumeIds: ['a', 'b'] }], { ...CUSTOMER, email: '' }),
    (error) => error.code === 'datos_invalidos' && error.status === 422 && Boolean(error.extra.fields.email),
  )
})

test('número de pedido', () => {
  assert.equal(formatOrderNumber(1001), 'GP-001001')
})

const saved = {
  id: '11111111-1111-4111-8111-111111111111',
  status: 'pendiente',
  total: 53000,
  mp_payment_id: null,
  payment_status: null,
}
const payment = (extra) => ({
  id: 77,
  external_reference: saved.id,
  status: 'approved',
  transaction_amount: 53000,
  currency_id: 'ARS',
  ...extra,
})

test('un pago aprobado por el total marca el pedido como pagado', () => {
  const patch = paymentUpdate(saved, payment(), new Date('2026-10-04T12:00:00Z'))
  assert.deepEqual(patch, {
    mp_payment_id: '77',
    payment_status: 'approved',
    status: 'pagado',
    paid_at: '2026-10-04T12:00:00.000Z',
  })
})

test('no marca pagado si el monto, la moneda o el pedido no coinciden', () => {
  assert.equal(paymentUpdate(saved, payment({ transaction_amount: 100 })).payment_status, 'monto_no_coincide')
  assert.equal(paymentUpdate(saved, payment({ currency_id: 'USD' })).status, undefined)
  assert.equal(paymentUpdate(saved, payment({ external_reference: 'otro' })), null)
  assert.deepEqual(paymentUpdate(saved, payment({ status: 'rejected' })), {
    mp_payment_id: '77',
    payment_status: 'rejected',
  })
})

test('un pedido ya pagado no cambia por otros pagos', () => {
  const paid = { ...saved, status: 'pagado', mp_payment_id: '77', payment_status: 'approved' }
  assert.equal(paymentUpdate(paid, payment()), null)
  assert.equal(paymentUpdate(paid, payment({ id: 99, status: 'rejected' })), null)
  assert.deepEqual(paymentUpdate(paid, payment({ status: 'refunded' })), { payment_status: 'refunded' })
})

test('la vista pública no expone el token ni datos de contacto de más', () => {
  const view = publicOrder({
    ...saved,
    number: 1001,
    access_token: 'secreto',
    items: [],
    subtotal: 50000,
    shipping_cost: 3000,
    customer_name: 'Juana',
    customer_email: 'j@mail.com',
    customer_phone: '379',
    address: 'Calle 1',
    city: 'Corrientes Capital',
    mp_init_point: 'https://mp.test/pagar/1',
  })
  assert.equal(view.number, 'GP-001001')
  assert.equal(view.retryUrl, 'https://mp.test/pagar/1')
  assert.ok(!JSON.stringify(view).includes('secreto'))
  assert.ok(!JSON.stringify(view).includes('379'))
})
