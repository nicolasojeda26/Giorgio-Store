// Panel sobre Supabase. Todas las operaciones van con la sesión del administrador:
// los permisos los aplica la base (RLS, ver supabase/schema.sql), no este código.
// Es JavaScript puro: recibe el cliente `sb`, así se puede probar fuera del navegador.
import { adminError } from './errors.js'

const BUCKET = 'productos'
const PROMO_FIELDS = [
  'slug',
  'name',
  'title',
  'detail',
  'description',
  'quantity',
  'price',
  'art',
  'image_url',
  'featured',
  'active',
  'position',
]
const PERFUME_FIELDS = [
  'slug',
  'name',
  'gender',
  'size',
  'family',
  'notes',
  'bottle_shape',
  'bottle_tone',
  'image_url',
  'stock',
  'active',
  'position',
]

const pick = (object, keys) =>
  Object.fromEntries(keys.filter((k) => object[k] !== undefined).map((k) => [k, object[k]]))

export function makeSupabaseApi(sb) {
  const run = async (query, code = 'guardar') => {
    const { data, error } = await query
    if (error) {
      console.error('[panel]', error.message)
      throw adminError(code)
    }
    return data
  }

  const isAdmin = async () => (await sb.rpc('is_admin')).data === true

  async function save(table, fields, values) {
    const row = pick(values, fields)
    const query = values.id ? sb.from(table).update(row).eq('id', values.id) : sb.from(table).insert(row)
    return run(query.select('id').single())
  }

  return {
    mode: 'supabase',

    /** Sesión vigente, solo si el usuario sigue siendo administrador. */
    async getSession() {
      const { data } = await sb.auth.getSession()
      if (!data.session) return null
      if (!(await isAdmin())) {
        await sb.auth.signOut()
        return null
      }
      return { email: data.session.user.email }
    },

    async signIn(email, password) {
      const { data, error } = await sb.auth.signInWithPassword({ email, password })
      if (error) throw adminError('credenciales')
      if (!(await isAdmin())) {
        await sb.auth.signOut()
        throw adminError('sin_permiso')
      }
      return { email: data.user.email }
    },

    signOut: () => sb.auth.signOut(),

    /** Todo lo que muestra el panel. Son pocos datos: se traen juntos y se filtran en pantalla. */
    async load() {
      const [promos, perfumes, links, settings, orders] = await Promise.all([
        run(sb.from('promos').select('*').order('position'), 'cargar'),
        run(sb.from('perfumes').select('*').order('name'), 'cargar'),
        run(sb.from('promo_perfumes').select('promo_id, perfume_id'), 'cargar'),
        run(sb.from('settings').select('shipping_zone, shipping_cost, shipping_eta').eq('id', 1).single(), 'cargar'),
        run(sb.from('orders').select('*').order('created_at', { ascending: false }).limit(300), 'cargar'),
      ])
      return { promos, perfumes, links, settings, orders }
    },

    async savePromo(values, perfumeIds) {
      const { id } = await save('promos', PROMO_FIELDS, values)
      await run(sb.rpc('set_promo_perfumes', { p_promo: id, p_perfumes: perfumeIds }))
      return id
    },
    patchPromo: (id, patch) =>
      run(sb.from('promos').update(pick(patch, PROMO_FIELDS)).eq('id', id).select('id').single()),
    deletePromo: (id) => run(sb.from('promos').delete().eq('id', id).select('id').single()),

    async savePerfume(values, promoIds) {
      const { id } = await save('perfumes', PERFUME_FIELDS, values)
      await run(sb.rpc('set_perfume_promos', { p_perfume: id, p_promos: promoIds }))
      return id
    },
    patchPerfume: (id, patch) =>
      run(sb.from('perfumes').update(pick(patch, PERFUME_FIELDS)).eq('id', id).select('id').single()),
    deletePerfume: (id) => run(sb.from('perfumes').delete().eq('id', id).select('id').single()),

    saveSettings: (values) =>
      run(
        sb
          .from('settings')
          .update(pick(values, ['shipping_zone', 'shipping_cost', 'shipping_eta']))
          .eq('id', 1)
          .select('id')
          .single(),
      ),

    setOrderStatus: (id, status) => run(sb.from('orders').update({ status }).eq('id', id).select('id').single()),

    /** Sube una foto ya achicada (ver admin/image.js) y devuelve su URL pública. */
    async uploadImage(blob, folder) {
      const extension = blob.type.split('/')[1] ?? 'jpg'
      const path = `${folder}/${globalThis.crypto.randomUUID()}.${extension}`
      const { error } = await sb.storage
        .from(BUCKET)
        .upload(path, blob, { contentType: blob.type, cacheControl: '31536000' })
      if (error) {
        console.error('[panel] foto', error.message)
        throw adminError('foto')
      }
      return sb.storage.from(BUCKET).getPublicUrl(path).data.publicUrl
    },
  }
}
