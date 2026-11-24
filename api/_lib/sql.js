// Conexión a Postgres. En Vercel es Neon (la base que se crea desde la pestaña Storage del proyecto,
// que carga sola la variable DATABASE_URL). Los tests usan la misma interfaz sobre PGlite.
//
// Interfaz:
//   query(text, params)   -> filas
//   batch([[text, params], ...]) -> ejecuta todo en una transacción y devuelve las filas de cada consulta
import { neon } from '@neondatabase/serverless'

export function makeNeonSql(url) {
  const sql = neon(url)
  return {
    query: (text, params = []) => sql.query(text, params),
    batch: (statements) => sql.transaction(statements.map(([text, params = []]) => sql.query(text, params))),
  }
}

/** Misma interfaz sobre PGlite (tests y prueba local). */
export function makePgliteSql(pg) {
  return {
    query: async (text, params = []) => (await pg.query(text, params)).rows,
    batch: (statements) =>
      pg.transaction(async (tx) => {
        const results = []
        for (const [text, params = []] of statements) results.push((await tx.query(text, params)).rows)
        return results
      }),
  }
}
