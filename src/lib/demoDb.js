// Base de datos del MODO DE PRUEBA (sin Supabase): vive en el navegador.
// Tiene la misma forma que las tablas reales, así la tienda y el panel usan el mismo código
// con o sin backend. Se llena con los datos de ejemplo de src/data.
import { promos as seedPromos } from '../data/promos.js'
import { perfumes as seedPerfumes } from '../data/perfumes.js'
import { site } from '../config/site.js'
import { toCatalog } from './catalogQueries.js'

const KEY = 'giorgio:base-de-prueba:v1'
const HOUR = 3_600_000

export const newId = () =>
  globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`

function seed() {
  const promos = seedPromos.map((p, position) => ({
    id: p.slug,
    slug: p.slug,
    name: p.name,
    title: p.title,
    detail: p.detail,
    description: p.description,
    quantity: p.quantity,
    price: p.price,
    art: p.art,
    image_url: null,
    featured: Boolean(p.featured),
    active: p.active,
    position,
  }))
  const perfumes = seedPerfumes.map((p, position) => ({
    id: p.id,
    slug: p.id,
    name: p.name,
    gender: p.gender,
    size: p.size,
    family: p.family,
    notes: p.notes,
    bottle_shape: p.bottle.shape,
    bottle_tone: p.bottle.tone,
    image_url: null,
    stock: p.stock,
    active: true,
    position,
  }))
  const links = seedPerfumes.flatMap((p) => p.promos.map((promo_id) => ({ promo_id, perfume_id: p.id })))
  const settings = {
    shipping_zone: site.shipping.zone,
    shipping_cost: site.shipping.cost,
    shipping_eta: site.shipping.eta,
  }

  // Pedidos de muestra, para que el panel no arranque vacío.
  const sample = (number, hoursAgo, status, customer, items) => {
    const lines = items.map(([promoSlug, ...perfumeIds]) => {
      const promo = promos.find((p) => p.slug === promoSlug)
      return {
        promo_slug: promo.slug,
        promo_title: promo.title,
        unit_price: promo.price,
        perfumes: perfumeIds.map((id) => {
          const perfume = perfumes.find((p) => p.id === id)
          return { slug: perfume.slug, name: perfume.name, size: perfume.size }
        }),
      }
    })
    const subtotal = lines.reduce((sum, line) => sum + line.unit_price, 0)
    const created = new Date(Date.now() - hoursAgo * HOUR).toISOString()
    return {
      id: `pedido-${number}`,
      number,
      status,
      ...customer,
      city: settings.shipping_zone,
      items: lines,
      subtotal,
      shipping_cost: settings.shipping_cost,
      total: subtotal + settings.shipping_cost,
      payment_status: status === 'pendiente' ? null : 'approved',
      paid_at: status === 'pendiente' ? null : created,
      created_at: created,
    }
  }
  const person = (customer_name, customer_phone, customer_email, address, address_notes = '') => ({
    customer_name,
    customer_phone,
    customer_email,
    address,
    address_notes,
  })
  const orders = [
    sample(
      1005,
      1,
      'pagado',
      person('Lucía Benítez', '379 4551203', 'lucia.benitez@mail.com', 'Mendoza 1450', 'Depto 3 B'),
      [['2-perfumes-100-ml', 'rosa-tardia', 'flor-de-sal']],
    ),
    sample(
      1004,
      5,
      'pagado',
      person('Martín Acosta', '379 4827719', 'martin.acosta@mail.com', 'Av. Independencia 3920'),
      [
        ['2-arabes-50-ml', 'oud-del-desierto', 'ambar-real'],
        ['decants-3', 'decant-ambar', 'decant-marino', 'decant-citrico'],
      ],
    ),
    sample(1003, 9, 'pendiente', person('Carla Romero', '379 4630088', 'carla.romero@mail.com', 'Lavalle 870'), [
      ['5-arabes', 'ambar-real', 'ambar-real', 'rosa-de-oriente', 'datil-y-miel', 'incienso-dorado'],
    ]),
    sample(
      1002,
      27,
      'enviado',
      person('Diego Sosa', '379 4219930', 'diego.sosa@mail.com', 'Catamarca 615', 'Casa con portón negro'),
      [['2-perfumes-100-ml', 'noche-de-ambar', 'madera-negra']],
    ),
    sample(1001, 52, 'entregado', person('Paula Giménez', '379 4902214', 'paula.gimenez@mail.com', 'San Martín 2104'), [
      ['2-perfumes-100-ml', 'ciruela-y-vainilla', 'costa-azul'],
    ]),
  ]

  return { promos, perfumes, links, settings, orders }
}

function load() {
  try {
    const data = JSON.parse(localStorage.getItem(KEY))
    return data?.promos && data?.perfumes && data?.orders ? data : null
  } catch {
    return null // sin almacenamiento disponible: la base de prueba vive solo en memoria
  }
}

let state = load() ?? seed()
const listeners = new Set()

function commit(next) {
  state = next
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch (error) {
    // Sin almacenamiento (o lleno, por ejemplo con muchas fotos): sigue en memoria hasta recargar.
    console.warn('[modo de prueba] no se pudo guardar en el navegador', error?.name)
  }
  listeners.forEach((listener) => listener())
}

export const demoDb = {
  get: () => state,
  update: (fn) => commit(fn(state)),
  reset: () => commit(seed()),
  /** Avisa cada vez que cambia algo (lo usa la tienda para reflejar lo editado en el panel). */
  subscribe(listener) {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },
}

/** Catálogo público a partir de la base de prueba: solo lo activo. */
export function demoCatalog() {
  const { promos, perfumes, links, settings } = state
  const activePromos = promos.filter((p) => p.active).sort((a, b) => a.position - b.position)
  const slugById = new Map(activePromos.map((p) => [p.id, p.slug]))
  return toCatalog({
    promos: activePromos,
    settings,
    perfumes: perfumes
      .filter((p) => p.active)
      .sort((a, b) => a.position - b.position)
      .map((p) => ({
        ...p,
        promoSlugs: links
          .filter((l) => l.perfume_id === p.id)
          .map((l) => slugById.get(l.promo_id))
          .filter(Boolean),
      })),
  })
}

/** Agrega el pedido del checkout de prueba (queda como pagado, sin cobro real). */
export function addDemoOrder({ customer, items, subtotal, shippingCost, total, city }) {
  const number = Math.max(1000, ...state.orders.map((o) => o.number)) + 1
  const now = new Date().toISOString()
  const order = {
    id: newId(),
    number,
    status: 'pagado',
    customer_name: customer.name,
    customer_phone: customer.phone,
    customer_email: customer.email,
    address: customer.address,
    address_notes: customer.notes ?? '',
    city,
    items,
    subtotal,
    shipping_cost: shippingCost,
    total,
    payment_status: 'approved',
    paid_at: now,
    created_at: now,
  }
  commit({ ...state, orders: [order, ...state.orders] })
  return order
}
