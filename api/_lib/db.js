// Acceso a Supabase desde el servidor, con la clave secreta (saltea RLS).
import { createClient } from '@supabase/supabase-js'

const unwrap = ({ data, error }) => {
  if (error) throw new Error(`Supabase: ${error.message}`)
  return data
}

export function makeDb(sb) {
  const orders = () => sb.from('orders')

  return {
    /** Catálogo necesario para validar un carrito, con la forma que espera buildOrder(). */
    async loadCatalog({ promoSlugs, perfumeSlugs }) {
      const [promoRows, perfumeRows, settings] = await Promise.all([
        sb.from('promos').select('id, slug, title, quantity, price, active').in('slug', promoSlugs).then(unwrap),
        sb.from('perfumes').select('id, slug, name, size, stock, active').in('slug', perfumeSlugs).then(unwrap),
        sb.from('settings').select('shipping_zone, shipping_cost').eq('id', 1).single().then(unwrap),
      ])
      const links = promoRows.length
        ? await sb
            .from('promo_perfumes')
            .select('promo_id, perfume_id')
            .in(
              'promo_id',
              promoRows.map((p) => p.id),
            )
            .then(unwrap)
        : []

      const perfumeSlugById = new Map(perfumeRows.map((p) => [p.id, p.slug]))
      const promos = new Map(
        promoRows.map((promo) => [
          promo.slug,
          {
            ...promo,
            perfumeSlugs: new Set(
              links
                .filter((l) => l.promo_id === promo.id)
                .map((l) => perfumeSlugById.get(l.perfume_id))
                .filter(Boolean),
            ),
          },
        ]),
      )
      return {
        promos,
        perfumes: new Map(perfumeRows.map((p) => [p.slug, p])),
        shipping: { zone: settings.shipping_zone, cost: settings.shipping_cost },
      }
    },

    insertOrder: (row) => orders().insert(row).select().single().then(unwrap),
    getOrder: (id) => orders().select().eq('id', id).maybeSingle().then(unwrap),
    updateOrder: (id, patch) => orders().update(patch).eq('id', id).select().single().then(unwrap),

    /** Marca la confirmación como enviada. Devuelve true solo la primera vez (evita emails duplicados). */
    async claimEmails(id, now = new Date()) {
      const rows = await orders()
        .update({ emails_sent_at: now.toISOString() })
        .eq('id', id)
        .is('emails_sent_at', null)
        .select('id')
        .then(unwrap)
      return rows.length > 0
    },
  }
}

let cached
export function getDb(config) {
  cached ??= makeDb(
    createClient(config.supabaseUrl, config.supabaseSecretKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    }),
  )
  return cached
}
