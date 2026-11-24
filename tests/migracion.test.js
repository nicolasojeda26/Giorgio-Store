// La base de producción se creó con el esquema v1 (un solo local). Al actualizar tiene que pasar sola a v2
// sin perder nada: el stock, los empleados y la caja quedan en el primer local.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { PGlite } from '@electric-sql/pglite'
import { makePgliteSql } from '../api/_lib/sql.js'
import * as v1 from './schema-v1.fixture.js'
import { ensureSchema, resetSchemaCache } from '../api/_lib/schema.js'

test('migración de v1 a v2', async () => {
  const sql = makePgliteSql(new PGlite())
  await v1.ensureSchema(sql)
  await sql.query("insert into usuarios (nombre, email, password_hash, rol) values ('Ana', 'ana@x', 'x', 'empleado')")
  const [p] = await sql.query(
    "insert into productos (nombre, stock, stock_minimo) values ('Perfume', 5, 1) returning id",
  )
  const [m] = await sql.query("select id from medios_pago where nombre = 'Efectivo'")
  await sql.query('select registrar_venta($1::jsonb)', [
    JSON.stringify({ medio_pago_id: m.id, items: [{ producto_id: p.id, cantidad: 1, precio_unit: 1000 }] }),
  ])

  resetSchemaCache()
  await ensureSchema(sql)
  const [primero] = await sql.query("select id from sucursales where nombre = 'Irigoyen'")
  assert.equal((await sql.query('select count(*)::int as n from sucursales'))[0].n, 2)
  assert.deepEqual(await sql.query('select rol, sucursal_id from usuarios'), [
    { rol: 'vendedor', sucursal_id: primero.id },
  ])
  assert.deepEqual(await sql.query('select sucursal_id, cantidad from existencias'), [
    { sucursal_id: primero.id, cantidad: 4 },
  ])
  for (const tabla of ['ventas', 'caja', 'movimientos_stock']) {
    const filas = await sql.query(`select sucursal_id from ${tabla}`)
    assert.ok(filas.length > 0 && filas.every((f) => f.sucursal_id === primero.id), tabla)
  }
  // Los gastos fijos de ejemplo (sin usar) pasan a generales + gastos de cada local.
  const gastos = await sql.query('select nombre, sucursal_id from gastos_fijos')
  assert.equal(gastos.filter((g) => g.nombre === 'Alquiler').length, 2)
  assert.ok(gastos.some((g) => g.nombre === 'Monotributo' && g.sucursal_id === null))
  // Volver a correrla no cambia nada.
  resetSchemaCache()
  await sql.query("update meta set value = '1' where key = 'schema_version'")
  await ensureSchema(sql)
  assert.equal((await sql.query('select count(*)::int as n from gastos_fijos'))[0].n, gastos.length)
  assert.equal((await sql.query('select count(*)::int as n from existencias'))[0].n, 1)
})
