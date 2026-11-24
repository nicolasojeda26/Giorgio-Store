// Dependencias de las funciones: configuración y base (Neon en Vercel). El esquema se crea solo.
import { makeNeonSql } from './sql.js'
import { ensureSchema } from './schema.js'

export const getConfig = (env = process.env) => ({
  // La carga sola la integración de Neon en Vercel (Storage).
  databaseUrl: env.DATABASE_URL || env.POSTGRES_URL || '',
  // Código para crear el primer usuario (el dueño). Lo elige Nico.
  setupCode: env.SETUP_CODE || '',
})

let sql
export async function getDeps() {
  const config = getConfig()
  if (!config.databaseUrl) return { config }
  sql ??= makeNeonSql(config.databaseUrl)
  await ensureSchema(sql)
  return { config, sql }
}

const fail = () =>
  new Response(
    JSON.stringify({
      error: { code: 'base_no_disponible', message: 'No pudimos conectar. Probá de nuevo en unos minutos.' },
    }),
    {
      status: 503,
      headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
    },
  )

/** Arma las dependencias y, si la base no responde, contesta un error claro. */
export const route = (handler) => async (request) => {
  let deps
  try {
    deps = await getDeps()
  } catch (error) {
    console.error('[base]', error)
    return fail()
  }
  return handler(request, deps)
}
