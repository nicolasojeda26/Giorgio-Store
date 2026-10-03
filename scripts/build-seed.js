// Genera supabase/seed.sql a partir de los datos de ejemplo de src/data.
// Uso: npm run seed:build
import { writeFileSync } from 'node:fs'
import { promos } from '../src/data/promos.js'
import { perfumes } from '../src/data/perfumes.js'
import { site } from '../src/config/site.js'

const q = (value) => `'${String(value).replace(/'/g, "''")}'`
const arr = (values) => `array[${values.map(q).join(', ')}]::text[]`

const lines = [
  '-- Datos de ejemplo. Generado con `npm run seed:build` desde src/data: no editar a mano.',
  '-- Se puede ejecutar más de una vez: actualiza lo que ya existe.',
  '',
  'insert into public.promos (slug, name, title, detail, description, quantity, price, art, featured, active, position) values',
  promos
    .map(
      (p, i) =>
        `  (${[q(p.slug), q(p.name), q(p.title), q(p.detail), q(p.description), p.quantity, p.price, q(p.art), Boolean(p.featured), p.active, i].join(', ')})`,
    )
    .join(',\n'),
  'on conflict (slug) do update set',
  '  name = excluded.name, title = excluded.title, detail = excluded.detail, description = excluded.description,',
  '  quantity = excluded.quantity, price = excluded.price, art = excluded.art, featured = excluded.featured,',
  '  active = excluded.active, position = excluded.position;',
  '',
  'insert into public.perfumes (slug, name, gender, size, family, notes, bottle_shape, bottle_tone, stock, position) values',
  perfumes
    .map(
      (p, i) =>
        `  (${[q(p.id), q(p.name), q(p.gender), q(p.size), q(p.family), arr(p.notes), q(p.bottle.shape), q(p.bottle.tone), p.stock, i].join(', ')})`,
    )
    .join(',\n'),
  'on conflict (slug) do update set',
  '  name = excluded.name, gender = excluded.gender, size = excluded.size, family = excluded.family,',
  '  notes = excluded.notes, bottle_shape = excluded.bottle_shape, bottle_tone = excluded.bottle_tone,',
  '  stock = excluded.stock, position = excluded.position;',
  '',
  'insert into public.promo_perfumes (promo_id, perfume_id)',
  'select promos.id, perfumes.id',
  'from (values',
  perfumes.flatMap((p) => p.promos.map((slug) => `  (${q(slug)}, ${q(p.id)})`)).join(',\n'),
  ') as pairs (promo_slug, perfume_slug)',
  'join public.promos on promos.slug = pairs.promo_slug',
  'join public.perfumes on perfumes.slug = pairs.perfume_slug',
  'on conflict do nothing;',
  '',
  `update public.settings set shipping_zone = ${q(site.shipping.zone)}, shipping_cost = ${site.shipping.cost}, shipping_eta = ${q(site.shipping.eta)} where id = 1;`,
  '',
]

writeFileSync(new URL('../supabase/seed.sql', import.meta.url), lines.join('\n'))
console.log(`supabase/seed.sql: ${promos.length} promos, ${perfumes.length} perfumes`)
