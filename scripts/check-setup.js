// Revisa que las cuentas estén bien conectadas. No modifica nada: solo lee.
// Uso: npm run check   (lee .env.local; si no existe, usa las variables del entorno)
import { existsSync, readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import { fetchCatalog } from '../src/lib/catalogQueries.js'

function loadEnv() {
  const file = new URL('../.env.local', import.meta.url)
  if (!existsSync(file)) return process.env
  const fromFile = Object.fromEntries(
    readFileSync(file, 'utf8')
      .split('\n')
      .map((line) => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/))
      .filter(Boolean)
      .map(([, key, value]) => [key, value.replace(/^(['"])(.*)\1$/, '$2')]),
  )
  return { ...process.env, ...fromFile }
}

const env = loadEnv()
let failed = 0
const ok = (text) => console.log(`  ok     ${text}`)
const warn = (text) => console.log(`  aviso  ${text}`)
const fail = (text) => {
  failed += 1
  console.log(`  FALLA  ${text}`)
}
const step = async (title, fn) => {
  console.log(`\n${title}`)
  try {
    await fn()
  } catch (error) {
    fail(error.message)
  }
}

const required = [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_PUBLISHABLE_KEY',
  'SUPABASE_SECRET_KEY',
  'MP_ACCESS_TOKEN',
  'SITE_URL',
]
const options = { auth: { persistSession: false, autoRefreshToken: false } }

await step('Variables de entorno', () => {
  for (const name of required) (env[name] ? ok : fail)(`${name}${env[name] ? '' : ' está vacía'}`)
  for (const name of ['MP_WEBHOOK_SECRET', 'RESEND_API_KEY', 'EMAIL_FROM', 'SHOP_EMAIL']) {
    if (!env[name]) warn(`${name} está vacía (opcional)`)
  }
  if (env.SITE_URL && !env.SITE_URL.startsWith('https://')) {
    warn('SITE_URL no es https: Mercado Pago no va a avisar los pagos ni volver solo a la web')
  }
  if (env.SUPABASE_SECRET_KEY && env.SUPABASE_SECRET_KEY === env.VITE_SUPABASE_PUBLISHABLE_KEY) {
    fail('SUPABASE_SECRET_KEY es igual a la clave publicable')
  }
})

if (env.VITE_SUPABASE_URL && env.VITE_SUPABASE_PUBLISHABLE_KEY) {
  const pub = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_PUBLISHABLE_KEY, options)

  await step('Supabase con la clave publicable (lo que ve la tienda)', async () => {
    const catalog = await fetchCatalog(pub)
    ok(`catálogo: ${catalog.promos.length} promos activas y ${catalog.perfumes.length} perfumes`)
    if (catalog.promos.length === 0)
      warn('no hay promos activas: ¿ejecutaste supabase/seed.sql o cargaste promos en el panel?')
    const empty = catalog.promos.filter((promo) => !catalog.perfumes.some((p) => p.promos.includes(promo.slug)))
    if (empty.length) warn(`promos sin perfumes: ${empty.map((p) => p.title).join(', ')}`)
    ok(`envío: ${catalog.shipping.zone}, $${catalog.shipping.cost}, ${catalog.shipping.eta}`)

    const orders = await pub.from('orders').select('id').limit(1)
    if (orders.data?.length) fail('la clave publicable puede leer pedidos: revisá las políticas de la tabla orders')
    else ok('no puede leer pedidos')
    const admin = await pub.rpc('is_admin')
    if (admin.error) fail(`falta la función is_admin(): ejecutá supabase/schema.sql (${admin.error.message})`)
    else ok('permisos del panel instalados')
  })

  if (env.SUPABASE_SECRET_KEY) {
    const secret = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SECRET_KEY, options)

    await step('Supabase con la clave secreta (lo que usa /api)', async () => {
      const orders = await secret.from('orders').select('id', { count: 'exact', head: true })
      if (orders.error) throw new Error(`no puede leer pedidos: ${orders.error.message}`)
      ok(`lee pedidos (${orders.count ?? 0} cargados)`)
      const admins = await secret.from('admins').select('user_id', { count: 'exact', head: true })
      if (admins.error) throw new Error(`no puede leer administradores: ${admins.error.message}`)
      if (admins.count) ok(`${admins.count} administrador(es) del panel`)
      else warn('todavía no hay administradores: ver "Crear el usuario del panel" en el README')
      const bucket = await secret.storage.getBucket('productos')
      if (bucket.error)
        warn(`no se encontró el bucket de fotos "productos": ejecutá supabase/storage.sql (${bucket.error.message})`)
      else if (!bucket.data.public) fail('el bucket "productos" no es público: las fotos no se van a ver')
      else ok('bucket de fotos "productos" listo')
    })
  }
}

if (env.MP_ACCESS_TOKEN) {
  await step('Mercado Pago', async () => {
    const response = await fetch('https://api.mercadopago.com/users/me', {
      headers: { authorization: `Bearer ${env.MP_ACCESS_TOKEN}` },
    })
    if (!response.ok) throw new Error(`el Access Token no es válido (respuesta ${response.status})`)
    const user = await response.json()
    ok(`cuenta ${user.nickname ?? user.id}, país ${user.site_id}`)
    if (user.site_id && user.site_id !== 'MLA')
      warn('la cuenta no es de Argentina (MLA): los precios están en pesos argentinos')
    if (env.MP_ACCESS_TOKEN.startsWith('TEST-')) warn('es un token de PRUEBA: no cobra de verdad')
  })
}

console.log(failed ? `\n${failed} problema(s) para resolver.` : '\nTodo en orden.')
process.exit(failed ? 1 : 0)
