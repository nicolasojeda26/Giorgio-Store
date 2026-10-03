// Utilidades de los tests: una base Postgres real en memoria (PGlite) con el esquema y los
// datos de ejemplo del proyecto, y dobles de Mercado Pago y de los emails.
import { readFileSync } from 'node:fs'
import { PGlite } from '@electric-sql/pglite'

const sql = (name) => readFileSync(new URL(`../supabase/${name}`, import.meta.url), 'utf8')

export async function createDatabase() {
  const pg = new PGlite()
  // Roles que en Supabase ya existen.
  await pg.exec('create role anon nologin; create role authenticated nologin;')
  await pg.exec('grant usage on schema public to anon, authenticated;')
  await pg.exec('alter default privileges in schema public grant all on tables to anon, authenticated;')
  await pg.exec(SUPABASE_STUBS)
  await pg.exec(sql('schema.sql'))
  await pg.exec(sql('storage.sql'))
  await pg.exec(sql('seed.sql'))
  return pg
}

// Lo mínimo de Supabase que usa el esquema: usuarios, auth.uid() y las tablas de Storage.
// auth.uid() lee el usuario del JWT igual que en Supabase; en los tests se fija con loginAs().
const SUPABASE_STUBS = `
  create schema auth;
  create table auth.users (id uuid primary key default gen_random_uuid(), email text unique);
  create function auth.uid() returns uuid language sql stable as $$
    select nullif(current_setting('request.jwt.claims', true)::json ->> 'sub', '')::uuid
  $$;
  grant usage on schema auth to anon, authenticated;
  create schema storage;
  create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
  create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text);
  alter table storage.objects enable row level security;
`

/** Crea un usuario; con admin: true también lo agrega a la tabla admins. Devuelve su id. */
export async function createUser(pg, email, { admin = false } = {}) {
  const { rows } = await pg.query('insert into auth.users (email) values ($1) returning id', [email])
  if (admin) await pg.query('insert into public.admins (user_id) values ($1)', [rows[0].id])
  return rows[0].id
}

/** Ejecuta fn como ese usuario (rol authenticated) o como visitante sin sesión (userId null). */
export async function as(pg, userId, fn) {
  const claims = JSON.stringify(userId ? { sub: userId, role: 'authenticated' } : {})
  await pg.exec(
    `set role ${userId ? 'authenticated' : 'anon'}; select set_config('request.jwt.claims', '${claims}', false);`,
  )
  try {
    return await fn()
  } finally {
    await pg.exec(`reset role; select set_config('request.jwt.claims', '', false);`)
  }
}

/** Misma interfaz que api/_lib/db.js, pero con SQL directo sobre PGlite. */
export function makeTestDb(pg) {
  const rows = async (query, params) => (await pg.query(query, params)).rows
  return {
    async loadCatalog({ promoSlugs, perfumeSlugs }) {
      const promoRows = await rows(
        `select p.slug, p.title, p.quantity, p.price, p.active,
                coalesce(array_agg(pf.slug) filter (where pf.slug is not null), '{}') as perfume_slugs
           from promos p
           left join promo_perfumes pp on pp.promo_id = p.id
           left join perfumes pf on pf.id = pp.perfume_id
          where p.slug = any($1) group by p.id`,
        [promoSlugs],
      )
      const perfumeRows = await rows('select slug, name, size, stock, active from perfumes where slug = any($1)', [
        perfumeSlugs,
      ])
      const [settings] = await rows('select shipping_zone, shipping_cost from settings where id = 1')
      return {
        promos: new Map(promoRows.map((p) => [p.slug, { ...p, perfumeSlugs: new Set(p.perfume_slugs) }])),
        perfumes: new Map(perfumeRows.map((p) => [p.slug, p])),
        shipping: { zone: settings.shipping_zone, cost: settings.shipping_cost },
      }
    },
    async insertOrder(row) {
      const keys = Object.keys(row)
      const values = keys.map((k) => (k === 'items' ? JSON.stringify(row[k]) : row[k]))
      const [order] = await rows(
        `insert into orders (${keys.join(', ')}) values (${keys.map((_, i) => `$${i + 1}`).join(', ')}) returning *`,
        values,
      )
      return order
    },
    getOrder: async (id) => (await rows('select * from orders where id = $1', [id]))[0] ?? null,
    async updateOrder(id, patch) {
      const keys = Object.keys(patch)
      const [order] = await rows(
        `update orders set ${keys.map((k, i) => `${k} = $${i + 2}`).join(', ')} where id = $1 returning *`,
        [id, ...keys.map((k) => patch[k])],
      )
      return order
    },
    async claimEmails(id) {
      const claimed = await rows(
        'update orders set emails_sent_at = now() where id = $1 and emails_sent_at is null returning id',
        [id],
      )
      return claimed.length > 0
    },
  }
}

export const CONFIG = {
  supabaseUrl: 'https://test.supabase.co',
  supabaseSecretKey: 'test-secret',
  mpAccessToken: 'TEST-token',
  mpWebhookSecret: '',
  siteUrl: 'https://giorgio.test',
  resendApiKey: '',
  emailFrom: '',
  shopEmail: '',
}

/** Doble de Mercado Pago: guarda las preferencias creadas y devuelve los pagos que se le cargan. */
export function makeFakeMp() {
  const mp = {
    preferences: [],
    payments: new Map(),
    failNext: false,
    async createPreference(preference, idempotencyKey) {
      if (mp.failNext) {
        mp.failNext = false
        throw Object.assign(new Error('Mercado Pago respondió 500'), { status: 500 })
      }
      mp.preferences.push({ preference, idempotencyKey })
      return { id: `pref-${mp.preferences.length}`, init_point: `https://mp.test/pagar/${mp.preferences.length}` }
    },
    async getPayment(id) {
      const payment = mp.payments.get(String(id))
      if (!payment) throw Object.assign(new Error('Mercado Pago respondió 404'), { status: 404 })
      return payment
    },
  }
  return mp
}

export const CUSTOMER = {
  name: 'Juana Pérez',
  phone: '379 4123456',
  email: 'Juana@Mail.com',
  address: 'Av. 3 de Abril 1234',
  notes: 'Timbre 2',
}

export const post = (path, body, headers = {}) =>
  new Request(`https://giorgio.test${path}`, { method: 'POST', body: JSON.stringify(body), headers })
export const get = (path) => new Request(`https://giorgio.test${path}`)
