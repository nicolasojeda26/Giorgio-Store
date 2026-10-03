// Panel en modo de prueba: las mismas operaciones que con Supabase, sobre la base del navegador.
// (En Node no hay localStorage: la base de prueba funciona en memoria, igual que en una vista previa.)
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { slugify, uniqueSlug } from '../src/admin/slug.js'
import { makeDemoApi } from '../src/admin/api/demo.js'
import { addDemoOrder, demoCatalog, demoDb } from '../src/lib/demoDb.js'

test('slugs para las direcciones de las promos', () => {
  assert.equal(slugify('2 Árabes 50 ml'), '2-arabes-50-ml')
  assert.equal(slugify('  ¡Promo   Niños & Niñas!  '), 'promo-ninos-ninas')
  assert.equal(uniqueSlug('5 árabes', ['5-arabes', '5-arabes-2']), '5-arabes-3')
  assert.equal(uniqueSlug('???', []), 'item')
})

test('el catálogo de prueba arranca igual que los datos de ejemplo', () => {
  demoDb.reset()
  const catalog = demoCatalog()
  assert.equal(catalog.promos.length, 4)
  assert.equal(catalog.perfumes.length, 26)
  assert.deepEqual(catalog.perfumes.find((p) => p.id === 'oud-del-desierto').promos.sort(), [
    '2-arabes-50-ml',
    '5-arabes',
  ])
  assert.deepEqual(catalog.shipping, { zone: 'Corrientes Capital', cost: 3000, eta: '24 a 48 h' })
})

test('lo que se cambia en el panel se refleja en la tienda', async () => {
  demoDb.reset()
  const api = makeDemoApi()
  let changes = 0
  const unsubscribe = demoDb.subscribe(() => (changes += 1))

  assert.equal(await api.getSession(), null)
  await api.signIn()
  assert.ok(await api.getSession())

  // pausar una promo
  await api.patchPromo('decants-3', { active: false })
  assert.equal(demoCatalog().promos.length, 3)
  assert.ok(!demoCatalog().perfumes.some((p) => p.promos.includes('decants-3')))

  // crear una promo con dos perfumes y después cambiarle precio y perfumes
  const id = await api.savePromo(
    {
      slug: 'nueva',
      name: 'Nueva',
      title: 'Nueva',
      detail: '',
      description: '',
      quantity: 2,
      price: 30000,
      art: 'duo',
    },
    ['costa-azul', 'flor-de-sal'],
  )
  let catalog = demoCatalog()
  assert.equal(catalog.promos.find((p) => p.slug === 'nueva').price, 30000)
  assert.equal(catalog.perfumes.filter((p) => p.promos.includes('nueva')).length, 2)
  await api.savePromo({ id, price: 32000 }, ['costa-azul'])
  catalog = demoCatalog()
  assert.equal(catalog.promos.find((p) => p.slug === 'nueva').price, 32000)
  assert.deepEqual(
    catalog.perfumes.filter((p) => p.promos.includes('nueva')).map((p) => p.id),
    ['costa-azul'],
  )

  // perfume nuevo, sin stock, oculto y borrado
  const perfumeId = await api.savePerfume(
    {
      slug: 'nuevo',
      name: 'Nuevo',
      gender: 'mujer',
      size: '100 ml',
      family: '',
      notes: [],
      bottle_shape: 'round',
      bottle_tone: 'rose',
    },
    [id, '2-perfumes-100-ml'],
  )
  assert.deepEqual(
    demoCatalog()
      .perfumes.find((p) => p.id === 'nuevo')
      .promos.sort(),
    ['2-perfumes-100-ml', 'nueva'],
  )
  await api.patchPerfume(perfumeId, { stock: false })
  assert.equal(demoCatalog().perfumes.find((p) => p.id === 'nuevo').stock, false)
  await api.patchPerfume(perfumeId, { active: false })
  assert.ok(!demoCatalog().perfumes.some((p) => p.id === 'nuevo'))
  await api.deletePerfume(perfumeId)
  await api.deletePromo(id)
  const data = await api.load()
  assert.deepEqual([data.promos.length, data.perfumes.length, data.links.length], [4, 26, 34])

  // ajustes y pedidos
  await api.saveSettings({ shipping_cost: 4500 })
  assert.equal(demoCatalog().shipping.cost, 4500)
  const order = addDemoOrder({
    customer: { name: 'Juana', phone: '379', email: 'j@mail.com', address: 'Calle 1', notes: '' },
    city: 'Corrientes Capital',
    items: [{ promo_slug: '5-arabes', promo_title: '5 árabes', unit_price: 25000, perfumes: [] }],
    subtotal: 25000,
    shippingCost: 4500,
    total: 29500,
  })
  assert.equal(order.number, 1006)
  await api.setOrderStatus(order.id, 'enviado')
  const orders = (await api.load()).orders
  assert.deepEqual([orders.length, orders[0].number, orders[0].status], [6, 1006, 'enviado'])

  assert.ok(changes >= 10)
  unsubscribe()
  await api.signOut()
  assert.equal(await api.getSession(), null)
  demoDb.reset()
  assert.equal(demoCatalog().shipping.cost, 3000)
})
