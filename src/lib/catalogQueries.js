// Lectura del catálogo público. Es JavaScript puro (sin React) para poder probarlo aparte.

const check = ({ data, error }) => {
  if (error) throw new Error(error.message)
  return data
}

/**
 * Convierte filas de la base en el catálogo que usa la tienda.
 * Cada perfume llega con `promoSlugs`: las promos ACTIVAS en las que entra.
 */
export function toCatalog({ promos, perfumes, settings }) {
  return {
    promos: promos.map((p) => ({
      slug: p.slug,
      name: p.name,
      title: p.title,
      detail: p.detail,
      description: p.description,
      quantity: p.quantity,
      price: p.price,
      art: p.art,
      image: p.image_url || null,
      featured: Boolean(p.featured),
      active: true,
    })),
    perfumes: perfumes.map((p) => ({
      id: p.slug,
      name: p.name,
      gender: p.gender,
      size: p.size,
      family: p.family,
      notes: p.notes ?? [],
      bottle: { shape: p.bottle_shape, tone: p.bottle_tone },
      image: p.image_url || null,
      stock: p.stock,
      promos: p.promoSlugs,
    })),
    shipping: { zone: settings.shipping_zone, cost: settings.shipping_cost, eta: settings.shipping_eta },
  }
}

/** Catálogo activo desde Supabase, con la clave publicable (RLS solo deja ver lo activo). */
export async function fetchCatalog(sb) {
  const [promos, perfumes, settings] = await Promise.all([
    sb
      .from('promos')
      .select('slug, name, title, detail, description, quantity, price, art, image_url, featured')
      .eq('active', true)
      .order('position')
      .then(check),
    sb
      .from('perfumes')
      .select(
        'slug, name, gender, size, family, notes, bottle_shape, bottle_tone, image_url, stock, promo_perfumes(promos(slug, active))',
      )
      .eq('active', true)
      .order('position')
      .then(check),
    sb.from('settings').select('shipping_zone, shipping_cost, shipping_eta').eq('id', 1).single().then(check),
  ])

  return toCatalog({
    promos,
    settings,
    perfumes: perfumes.map((p) => ({
      ...p,
      // Una promo pausada llega como null para el público y con active: false para el administrador.
      promoSlugs: (p.promo_perfumes ?? []).filter((link) => link.promos?.active).map((link) => link.promos.slug),
    })),
  })
}
