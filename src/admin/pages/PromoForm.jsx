import { useMemo, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { Search } from 'lucide-react'
import { PromoArt } from '../../components/Bottles.jsx'
import { GENDER_LABEL } from '../format.js'
import ImageInput from '../ImageInput.jsx'
import { uniqueSlug } from '../slug.js'
import { useAdmin } from '../store.jsx'
import {
  Button,
  Confirm,
  Field,
  MoneyInput,
  PageHeader,
  SaveBar,
  Switch,
  Thumb,
  cardClass,
  inputClass,
} from '../ui.jsx'

const ARTS = [
  { value: 'duo', label: 'Dos frascos' },
  { value: 'arabes', label: 'Dos árabes' },
  { value: 'cinco', label: 'Cinco árabes' },
  { value: 'decants', label: 'Decants' },
]
const EMPTY = {
  name: '',
  detail: '',
  description: '',
  quantity: 2,
  price: '',
  art: 'duo',
  image_url: null,
  featured: false,
  active: true,
}
const normalize = (text) => text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

// "2 perfumes" + "100 ml" -> "2 perfumes 100 ml". Una etiqueta sin números ("Combo") no se suma al nombre.
const titleOf = ({ name, detail }) => (/\d/.test(detail) ? `${name} ${detail}` : name).trim()

export default function PromoForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { data, run } = useAdmin()
  const isNew = id === 'nueva'
  const promo = isNew ? null : data.promos.find((p) => p.id === id)

  const [values, setValues] = useState(() => (promo ? { ...EMPTY, ...promo } : EMPTY))
  const [initial] = useState(() => new Set(data.links.filter((l) => l.promo_id === id).map((l) => l.perfume_id)))
  const [selected, setSelected] = useState(initial)
  const [query, setQuery] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const visible = useMemo(() => {
    const q = normalize(query.trim())
    // Primero los que ya estaban en la promo al abrir la pantalla (no se reordena al marcar).
    const rank = (p) => (initial.has(p.id) ? 0 : 1)
    return data.perfumes
      .filter((p) => !q || normalize(`${p.name} ${p.size}`).includes(q))
      .sort((a, b) => rank(a) - rank(b))
  }, [data.perfumes, query, initial])

  if (!isNew && !promo) return <Navigate to="/admin/promos" replace />

  const set = (field) => (value) => setValues((prev) => ({ ...prev, [field]: value }))
  const text = (field) => ({ value: values[field], onChange: (e) => set(field)(e.target.value) })

  const errors = {
    name: values.name.trim().length < 2 ? 'Escribí el nombre de la promo.' : undefined,
    price: !(values.price > 0) ? 'Escribí el precio de la promo.' : undefined,
    quantity: !(values.quantity >= 1 && values.quantity <= 12) ? 'Tiene que ser un número entre 1 y 12.' : undefined,
  }
  const errorOf = (field) => (submitted ? errors[field] : undefined)

  function togglePerfume(perfumeId) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(perfumeId)) next.delete(perfumeId)
      else next.add(perfumeId)
      return next
    })
  }

  async function onSubmit(event) {
    event.preventDefault()
    setSubmitted(true)
    const firstInvalid = ['name', 'price', 'quantity'].find((field) => errors[field])
    if (firstInvalid) return document.getElementById(firstInvalid)?.focus()

    setSaving(true)
    const row = {
      ...(promo
        ? { id: promo.id }
        : {
            slug: uniqueSlug(
              titleOf(values),
              data.promos.map((p) => p.slug),
            ),
            position: data.promos.length,
          }),
      name: values.name.trim(),
      detail: values.detail.trim(),
      title: titleOf({ name: values.name.trim(), detail: values.detail.trim() }),
      description: values.description.trim(),
      quantity: Number(values.quantity),
      price: values.price,
      art: values.art,
      image_url: values.image_url,
      featured: values.featured,
      active: values.active,
    }
    const { ok } = await run(async (api) => {
      const savedId = await api.savePromo(row, [...selected])
      // Solo una promo ocupa la tarjeta grande del inicio.
      if (row.featured) {
        for (const other of data.promos) {
          if (other.featured && other.id !== savedId) await api.patchPromo(other.id, { featured: false })
        }
      }
    }, 'Promo guardada')
    setSaving(false)
    if (ok) navigate('/admin/promos')
  }

  async function onDelete() {
    setSaving(true)
    const { ok } = await run((api) => api.deletePromo(promo.id), 'Promo eliminada')
    setSaving(false)
    setDeleting(false)
    if (ok) navigate('/admin/promos')
  }

  return (
    <form onSubmit={onSubmit} noValidate>
      <PageHeader title={isNew ? 'Nueva promo' : 'Editar promo'} back="/admin/promos" />

      <div className="space-y-6">
        <section className={`${cardClass} space-y-5 p-5`}>
          <Field
            id="name"
            label="Nombre"
            hint="Como se lee en la tarjeta. Por ejemplo: 2 perfumes."
            error={errorOf('name')}
          >
            <input
              id="name"
              maxLength={40}
              aria-invalid={Boolean(errorOf('name')) || undefined}
              className={inputClass}
              {...text('name')}
            />
          </Field>
          <Field id="detail" label="Etiqueta" optional hint="Tamaño o aclaración corta. Por ejemplo: 100 ml.">
            <input id="detail" maxLength={24} className={inputClass} {...text('detail')} />
          </Field>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field id="price" label="Precio de la promo" error={errorOf('price')}>
              <MoneyInput id="price" value={values.price} onChange={set('price')} invalid={Boolean(errorOf('price'))} />
            </Field>
            <Field
              id="quantity"
              label="Cuántos perfumes elige"
              hint="El cliente arma el combo con esta cantidad."
              error={errorOf('quantity')}
            >
              <input
                id="quantity"
                type="number"
                inputMode="numeric"
                min={1}
                max={12}
                value={values.quantity}
                onChange={(e) => set('quantity')(e.target.value === '' ? '' : Number(e.target.value))}
                aria-invalid={Boolean(errorOf('quantity')) || undefined}
                className={inputClass}
              />
            </Field>
          </div>
          <Field id="description" label="Descripción" optional hint="Una o dos líneas debajo del nombre.">
            <textarea
              id="description"
              rows={3}
              maxLength={160}
              className={`${inputClass} h-auto py-3`}
              {...text('description')}
            />
          </Field>
        </section>

        <section className={`${cardClass} space-y-5 p-5`}>
          <h2 className="font-display text-[1.5rem]">Imagen</h2>
          <ImageInput
            value={values.image_url}
            onChange={set('image_url')}
            folder="promos"
            fallback={<PromoArt kind={values.art} className="h-[82%] w-[86%]" />}
          />
          {!values.image_url && (
            <fieldset>
              <legend className="text-[0.9375rem] font-semibold">Ilustración, si no subís foto</legend>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {ARTS.map((art) => (
                  <label
                    key={art.value}
                    className={`flex cursor-pointer flex-col items-center gap-2 rounded-[3px] border p-2 text-sm font-semibold has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-gold ${
                      values.art === art.value ? 'border-ink bg-ink text-paper' : 'border-ink/25'
                    }`}
                  >
                    <input
                      type="radio"
                      name="art"
                      value={art.value}
                      checked={values.art === art.value}
                      onChange={() => set('art')(art.value)}
                      className="sr-only"
                    />
                    <span className="grid h-16 w-full place-items-end justify-center rounded-[3px] bg-ink">
                      <PromoArt kind={art.value} className="h-[84%] w-[80%]" />
                    </span>
                    {art.label}
                  </label>
                ))}
              </div>
            </fieldset>
          )}
        </section>

        <section className={`${cardClass} p-5`}>
          <Switch checked={values.active} onChange={set('active')} label="Visible en la tienda" />
          <div className="mt-1 border-t border-line pt-1">
            <Switch checked={values.featured} onChange={set('featured')} label="Destacada: tarjeta grande del inicio" />
          </div>
        </section>

        <section className={`${cardClass} p-5`}>
          <div className="flex items-baseline justify-between gap-4">
            <h2 className="font-display text-[1.5rem]">Perfumes de la promo</h2>
            <p className="text-sm text-mute-ink" aria-live="polite">
              {selected.size} de {data.perfumes.length}
            </p>
          </div>
          <p className="mt-1 text-sm text-mute-ink">Marcá los que el cliente puede elegir dentro de esta promo.</p>
          {selected.size === 0 && (
            <p className="mt-3 rounded-[3px] border border-danger/40 p-3 text-sm text-danger">
              Sin perfumes marcados, nadie va a poder armar el combo.
            </p>
          )}

          {data.perfumes.length === 0 ? (
            <p className="mt-4 text-mute-ink">
              Todavía no cargaste perfumes. Guardá la promo y sumalos desde Perfumes.
            </p>
          ) : (
            <>
              <label className="relative mt-4 block">
                <span className="sr-only">Buscar perfume</span>
                <Search
                  size={17}
                  strokeWidth={1.8}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-mute-ink"
                />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar perfume"
                  className={`${inputClass} pl-10`}
                />
              </label>
              <ul className="mt-3 divide-y divide-line">
                {visible.map((perfume) => (
                  <li key={perfume.id}>
                    <label className="flex min-h-16 cursor-pointer items-center gap-3 py-2">
                      <input
                        type="checkbox"
                        checked={selected.has(perfume.id)}
                        onChange={() => togglePerfume(perfume.id)}
                        className="size-5 shrink-0 accent-ink"
                      />
                      <Thumb
                        image={perfume.image_url}
                        bottle={{ shape: perfume.bottle_shape, tone: perfume.bottle_tone }}
                        className="size-11"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-semibold">{perfume.name}</span>
                        <span className="block text-sm text-mute-ink">
                          {[
                            perfume.size,
                            GENDER_LABEL[perfume.gender],
                            !perfume.stock && 'sin stock',
                            !perfume.active && 'oculto',
                          ]
                            .filter(Boolean)
                            .join(' · ')}
                        </span>
                      </span>
                    </label>
                  </li>
                ))}
                {visible.length === 0 && <li className="py-6 text-center text-mute-ink">Ningún perfume coincide.</li>}
              </ul>
            </>
          )}
        </section>

        {!isNew && (
          <Button variant="danger" onClick={() => setDeleting(true)}>
            Eliminar promo
          </Button>
        )}
      </div>

      <SaveBar saving={saving} cancelTo="/admin/promos" label={isNew ? 'Crear promo' : 'Guardar cambios'} />

      <Confirm
        open={deleting}
        title={`¿Eliminar ${promo?.title}?`}
        confirmLabel="Sí, eliminar"
        busy={saving}
        onConfirm={onDelete}
        onCancel={() => setDeleting(false)}
      >
        La promo desaparece de la tienda y no se puede recuperar. Los perfumes no se borran. Si solo querés sacarla un
        tiempo, pausala.
      </Confirm>
    </form>
  )
}
