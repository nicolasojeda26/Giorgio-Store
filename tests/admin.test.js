// Permisos del panel de administración, probados sobre el esquema real (PGlite).
import { test, before } from 'node:test'
import assert from 'node:assert/strict'
import { as, createDatabase, createUser } from './helpers.js'

let pg, admin, cliente
const ORDER = `insert into orders (customer_name, customer_phone, customer_email, address, city, items, subtotal, shipping_cost, total)
               values ('Juana', '379', 'j@mail.com', 'Calle 1', 'Corrientes Capital', '[]', 1, 1, 2) returning id`
const one = async (query, params) => (await pg.query(query, params)).rows[0]
const count = async (query, params) => (await pg.query(query, params)).rows.length
const denied = (promise) => assert.rejects(promise, /row-level security|permission denied|Solo el administrador/)

before(async () => {
  pg = await createDatabase()
  admin = await createUser(pg, 'admin@giorgio.test', { admin: true })
  cliente = await createUser(pg, 'curioso@mail.com')
  await pg.exec("update promos set active = false where slug = 'decants-3'")
})

test('is_admin() distingue al administrador de cualquier otro usuario', async () => {
  assert.equal((await as(pg, admin, () => one('select is_admin() as ok'))).ok, true)
  assert.equal((await as(pg, cliente, () => one('select is_admin() as ok'))).ok, false)
  assert.equal((await as(pg, null, () => one('select is_admin() as ok'))).ok, false)
})

test('el administrador ve también lo pausado; el resto solo lo activo', async () => {
  assert.equal(await as(pg, admin, () => count('select 1 from promos')), 4)
  assert.equal(await as(pg, cliente, () => count('select 1 from promos')), 3)
  assert.equal(await as(pg, null, () => count('select 1 from promos')), 3)
})

test('el administrador crea, edita y borra promos y perfumes', async () => {
  await as(pg, admin, async () => {
    const promo = await one(
      "insert into promos (slug, name, title, quantity, price) values ('nueva', 'Nueva', 'Nueva', 3, 40000) returning id",
    )
    const perfume = await one(
      "insert into perfumes (slug, name, gender) values ('nuevo', 'Nuevo', 'unisex') returning id",
    )
    assert.equal(await count("update promos set price = 45000 where slug = 'nueva' returning id"), 1)
    assert.equal(await count("update perfumes set stock = false where slug = 'nuevo' returning id"), 1)
    assert.equal(await count('update settings set shipping_cost = 3500 where id = 1 returning id'), 1)

    await pg.query('select set_promo_perfumes($1, $2)', [promo.id, [perfume.id]])
    assert.equal(await count('select 1 from promo_perfumes where promo_id = $1', [promo.id]), 1)
    await pg.query('select set_promo_perfumes($1, $2)', [promo.id, []])
    assert.equal(await count('select 1 from promo_perfumes where promo_id = $1', [promo.id]), 0)

    const duo = await one("select id from promos where slug = '2-perfumes-100-ml'")
    await pg.query('select set_perfume_promos($1, $2)', [perfume.id, [promo.id, duo.id]])
    assert.equal(await count('select 1 from promo_perfumes where perfume_id = $1', [perfume.id]), 2)
    await pg.query('select set_perfume_promos($1, $2)', [perfume.id, [duo.id]])
    assert.equal(await count('select 1 from promo_perfumes where perfume_id = $1', [perfume.id]), 1)

    assert.equal(await count("delete from perfumes where slug = 'nuevo' returning id"), 1)
    assert.equal(await count("delete from promos where slug = 'nueva' returning id"), 1)
  })
  await pg.exec('update settings set shipping_cost = 3000 where id = 1')
})

test('un usuario que no es administrador no puede tocar el catálogo ni los ajustes', async () => {
  for (const user of [cliente, null]) {
    await as(pg, user, async () => {
      await denied(pg.query("insert into promos (slug, name, title, quantity, price) values ('x', 'x', 'x', 1, 1)"))
      await denied(pg.query("insert into perfumes (slug, name, gender) values ('x', 'x', 'unisex')"))
      assert.equal(await count("update promos set price = 1 where slug = '5-arabes' returning id"), 0)
      assert.equal(await count("update perfumes set stock = false where slug = 'costa-azul' returning id"), 0)
      assert.equal(await count("delete from perfumes where slug = 'costa-azul' returning id"), 0)
      assert.equal(await count('update settings set shipping_cost = 0 where id = 1 returning id'), 0)
      assert.equal(await count('delete from promo_perfumes returning promo_id'), 0)
      assert.equal(await count('select 1 from admins'), 0)
      await denied(pg.query('insert into admins (user_id) values ($1)', [user ?? cliente]))
    })
  }
  const promo = await one("select id from promos where slug = '5-arabes'")
  await as(pg, cliente, () => denied(pg.query('select set_promo_perfumes($1, $2)', [promo.id, []])))
  await as(pg, null, () => denied(pg.query('select set_promo_perfumes($1, $2)', [promo.id, []])))
  assert.equal((await one("select price from promos where slug = '5-arabes'")).price, 25000)
  assert.equal(await count('select 1 from promo_perfumes where promo_id = $1', [promo.id]), 8)
})

test('pedidos: el administrador los lee y solo cambia el estado; nadie más los ve', async () => {
  const order = await one(ORDER)
  await as(pg, admin, async () => {
    assert.equal(await count('select 1 from orders where id = $1', [order.id]), 1)
    assert.equal(await count("update orders set status = 'enviado' where id = $1 returning id", [order.id]), 1)
    await denied(pg.query('update orders set total = 1 where id = $1', [order.id]))
    await denied(pg.query("update orders set payment_status = 'approved', paid_at = now() where id = $1", [order.id]))
    await denied(pg.query('delete from orders where id = $1', [order.id]))
    await denied(pg.query(ORDER))
    await assert.rejects(
      pg.query("update orders set status = 'regalado' where id = $1", [order.id]),
      /check constraint/,
    )
  })
  for (const user of [cliente, null]) {
    await as(pg, user, async () => {
      assert.equal(await count('select 1 from orders'), 0)
      // Sin sesión no hay permiso; con sesión pero sin ser administrador, no encuentra ninguna fila.
      const update = pg.query("update orders set status = 'entregado' where id = $1 returning id", [order.id])
      if (user) assert.equal((await update).rows.length, 0)
      else await denied(update)
      await denied(pg.query(ORDER))
    })
  }
  assert.deepEqual(await one('select status, total from orders where id = $1', [order.id]), {
    status: 'enviado',
    total: 2,
  })
})

test('fotos: solo el administrador puede subir al bucket productos', async () => {
  const upload = (bucket) =>
    pg.query("insert into storage.objects (bucket_id, name) values ($1, 'perfumes/a.webp')", [bucket])
  await pg.exec(
    'grant usage on schema storage to anon, authenticated; grant all on storage.objects to anon, authenticated;',
  )
  await as(pg, admin, () => upload('productos'))
  await as(pg, admin, () => denied(upload('otro-bucket')))
  await as(pg, cliente, () => denied(upload('productos')))
  await as(pg, null, () => denied(upload('productos')))
  const bucket = await one("select public, file_size_limit from storage.buckets where id = 'productos'")
  assert.equal(bucket.public, true)
  assert.equal(Number(bucket.file_size_limit), 2 * 1024 * 1024)
})
