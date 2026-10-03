// Panel en MODO DE PRUEBA: mismas operaciones que api/supabase.js, pero sobre la base
// de prueba del navegador (lib/demoDb.js). No hay usuarios ni contraseñas.
import { demoDb, newId } from '../../lib/demoDb.js'
import { adminError } from './errors.js'

const SESSION_KEY = 'giorgio:panel-de-prueba'
const wait = (ms = 250) => new Promise((resolve) => setTimeout(resolve, ms)) // imita la red

const flag = {
  get() {
    try {
      return sessionStorage.getItem(SESSION_KEY) === '1'
    } catch {
      return memory
    }
  },
  set(value) {
    memory = value
    try {
      if (value) sessionStorage.setItem(SESSION_KEY, '1')
      else sessionStorage.removeItem(SESSION_KEY)
    } catch {
      /* sin almacenamiento: queda en memoria */
    }
  },
}
let memory = false

const SESSION = { email: 'Modo de prueba' }
const replace = (rows, id, patch) => rows.map((row) => (row.id === id ? { ...row, ...patch } : row))

function upsert(rows, values, defaults) {
  if (values.id) return { id: values.id, rows: replace(rows, values.id, values) }
  const id = newId()
  return { id, rows: [...rows, { ...defaults, ...values, id, position: rows.length }] }
}

export function makeDemoApi() {
  return {
    mode: 'demo',

    getSession: async () => (flag.get() ? SESSION : null),
    async signIn() {
      await wait()
      flag.set(true)
      return SESSION
    },
    signOut: async () => flag.set(false),

    async load() {
      await wait(120)
      const { promos, perfumes, links, settings, orders } = demoDb.get()
      return {
        promos: [...promos].sort((a, b) => a.position - b.position),
        perfumes: [...perfumes].sort((a, b) => a.name.localeCompare(b.name, 'es')),
        links,
        settings,
        orders: [...orders].sort((a, b) => b.created_at.localeCompare(a.created_at)),
      }
    },

    async savePromo(values, perfumeIds) {
      await wait()
      let saved
      demoDb.update((db) => {
        const result = upsert(db.promos, values, { image_url: null, featured: false, active: true })
        saved = result.id
        return {
          ...db,
          promos: result.rows,
          links: [
            ...db.links.filter((l) => l.promo_id !== saved),
            ...perfumeIds.map((perfume_id) => ({ promo_id: saved, perfume_id })),
          ],
        }
      })
      return saved
    },
    async patchPromo(id, patch) {
      await wait(80)
      demoDb.update((db) => ({ ...db, promos: replace(db.promos, id, patch) }))
    },
    async deletePromo(id) {
      await wait()
      demoDb.update((db) => ({
        ...db,
        promos: db.promos.filter((p) => p.id !== id),
        links: db.links.filter((l) => l.promo_id !== id),
      }))
    },

    async savePerfume(values, promoIds) {
      await wait()
      let saved
      demoDb.update((db) => {
        const result = upsert(db.perfumes, values, { image_url: null, stock: true, active: true })
        saved = result.id
        return {
          ...db,
          perfumes: result.rows,
          links: [
            ...db.links.filter((l) => l.perfume_id !== saved),
            ...promoIds.map((promo_id) => ({ promo_id, perfume_id: saved })),
          ],
        }
      })
      return saved
    },
    async patchPerfume(id, patch) {
      await wait(80)
      demoDb.update((db) => ({ ...db, perfumes: replace(db.perfumes, id, patch) }))
    },
    async deletePerfume(id) {
      await wait()
      demoDb.update((db) => ({
        ...db,
        perfumes: db.perfumes.filter((p) => p.id !== id),
        links: db.links.filter((l) => l.perfume_id !== id),
      }))
    },

    async saveSettings(values) {
      await wait()
      demoDb.update((db) => ({ ...db, settings: { ...db.settings, ...values } }))
    },

    async setOrderStatus(id, status) {
      await wait()
      demoDb.update((db) => ({ ...db, orders: replace(db.orders, id, { status }) }))
    },

    /** En modo de prueba la foto se guarda dentro del navegador, como texto. */
    uploadImage: (blob) =>
      new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result)
        reader.onerror = () => reject(adminError('foto'))
        reader.readAsDataURL(blob)
      }),

    reset: async () => demoDb.reset(),
  }
}
