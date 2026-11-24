// Base Postgres real en memoria (PGlite) con el mismo esquema que se crea en producción,
// y un cliente que habla con /api/rpc como lo hace la aplicación.
import { PGlite } from '@electric-sql/pglite'
import { makePgliteSql } from '../api/_lib/sql.js'
import { ensureSchema, resetSchemaCache } from '../api/_lib/schema.js'
import { handleRpc } from '../api/_lib/rpc.js'

export const CONFIG = { databaseUrl: 'pglite', setupCode: 'codigo-de-prueba' }

export async function createSystem() {
  const pg = new PGlite()
  const sql = makePgliteSql(pg)
  resetSchemaCache()
  await ensureSchema(sql)
  resetSchemaCache()
  return { pg, sql, deps: { config: CONFIG, sql } }
}

/** Cliente con su propia cookie de sesión. */
export function client(deps, { ip = '1.1.1.1' } = {}) {
  let cookie = null
  const c = {
    async call(action, payload = {}, headers = {}) {
      const response = await handleRpc(
        new Request('https://giorgio.test/api/rpc', {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-giorgio-sistema': '1',
            'x-forwarded-for': ip,
            ...(cookie ? { cookie } : {}),
            ...headers,
          },
          body: JSON.stringify({ action, ...payload }),
        }),
        deps,
      )
      const setCookie = response.headers.get('set-cookie')
      if (setCookie) cookie = setCookie.includes('Max-Age=0') ? null : setCookie.split(';')[0]
      return { status: response.status, body: await response.json() }
    },
    /** Igual que call, pero falla el test si la respuesta no es 200. */
    async ok(action, payload) {
      const r = await c.call(action, payload)
      if (r.status !== 200) throw new Error(`${action}: ${r.status} ${JSON.stringify(r.body)}`)
      return r.body
    },
    session: async () =>
      (
        await handleRpc(new Request('https://giorgio.test/api/rpc', { headers: cookie ? { cookie } : {} }), deps)
      ).json(),
  }
  return c
}

/** Sistema con dueño, una encargada y vendedores en los dos locales, listos para usar. */
export async function readySystem() {
  const system = await createSystem()
  const dueno = client(system.deps)
  await dueno.ok('primerUsuario', {
    codigo: CONFIG.setupCode,
    nombre: 'Giorgio',
    email: 'giorgio@mail.com',
    password: 'clave-dueno-1',
  })
  const { sucursales } = await dueno.ok('inicio')
  const [centro, norte] = sucursales.map((x) => x.id)
  const crear = async (nombre, email, rol, sucursal_id, ip) => {
    await dueno.ok('guardarUsuario', { usuario: { nombre, email, rol, sucursal_id, password: `clave-${nombre}-1` } })
    const c = client(system.deps, { ip })
    await c.ok('ingresar', { email, password: `clave-${nombre}-1` })
    return c
  }
  const encargada = await crear('Laura', 'laura@mail.com', 'encargado', centro, '4.4.4.4')
  const empleado = await crear('Ana', 'ana@mail.com', 'vendedor', centro, '2.2.2.2')
  const vendedorNorte = await crear('Beto', 'beto@mail.com', 'vendedor', norte, '5.5.5.5')
  return { ...system, dueno, encargada, empleado, vendedorNorte, centro, norte }
}
