import { useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { Bottle } from '../../components/Bottles.jsx'
import { GENDERS } from '../format.js'
import ImageInput from '../ImageInput.jsx'
import { uniqueSlug } from '../slug.js'
import { useAdmin } from '../store.jsx'
import { Button, Confirm, Field, PageHeader, SaveBar, Switch, cardClass, inputClass } from '../ui.jsx'

const SHAPES = [
  { value: 'flacon', label: 'Rectangular' },
  { value: 'round', label: 'Redondo' },
  { value: 'arabesque', label: 'Árabe' },
  { value: 'vial', label: 'Decant' },
]
const TONES = [
  { value: 'smoke', label: 'Negro' },
  { value: 'amber', label: 'Ámbar' },
  { value: 'champagne', label: 'Dorado claro' },
  { value: 'rose', label: 'Rosa' },
  { value: 'azul', label: 'Azul' },
  { value: 'esmeralda', label: 'Verde' },
  { value: 'ciruela', label: 'Violeta' },
]
const NOTES = ['Salida', 'Corazón', 'Fondo']
const EMPTY = {
  name: '',
  gender: 'unisex',
  size: '',
  family: '',
  notes: ['', '', ''],
  bottle_shape: 'flacon',
  bottle_tone: 'smoke',
  image_url: null,
  stock: true,
  active: true,
}

export default function PerfumeForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { data, run } = useAdmin()
  const isNew = id === 'nuevo'
  const perfume = isNew ? null : data.perfumes.find((p) => p.id === id)

  const [values, setValues] = useState(() =>
    perfume ? { ...EMPTY, ...perfume, notes: NOTES.map((_, i) => perfume.notes?.[i] ?? '') } : EMPTY,
  )
  const [promoIds, setPromoIds] = useState(
    () => new Set(data.links.filter((l) => l.perfume_id === id).map((l) => l.promo_id)),
  )
  const [submitted, setSubmitted] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  if (!isNew && !perfume) return <Navigate to="/admin/perfumes" replace />

  const set = (field) => (value) => setValues((prev) => ({ ...prev, [field]: value }))
  const text = (field) => ({ value: values[field], onChange: (e) => set(field)(e.target.value) })
  const nameError = submitted && values.name.trim().length < 2 ? 'Escribí el nombre del perfume.' : undefined

  function togglePromo(promoId) {
    setPromoIds((prev) => {
      const next = new Set(prev)
      if (next.has(promoId)) next.delete(promoId)
      else next.add(promoId)
      return next
    })
  }

  async function onSubmit(event) {
    event.preventDefault()
    setSubmitted(true)
    if (values.name.trim().length < 2) return document.getElementById('name')?.focus()

    setSaving(true)
    const notes = values.notes.map((note) => note.trim())
    const row = {
      ...(perfume
        ? { id: perfume.id }
        : {
            slug: uniqueSlug(
              `${values.name} ${values.size}`,
              data.perfumes.map((p) => p.slug),
            ),
            position: data.perfumes.length,
          }),
      name: values.name.trim(),
      gender: values.gender,
      size: values.size.trim(),
      family: values.family.trim(),
      notes: notes.some(Boolean) ? notes : [],
      bottle_shape: values.bottle_shape,
      bottle_tone: values.bottle_tone,
      image_url: values.image_url,
      stock: values.stock,
      active: values.active,
    }
    const { ok } = await run((api) => api.savePerfume(row, [...promoIds]), 'Perfume guardado')
    setSaving(false)
    if (ok) navigate('/admin/perfumes')
  }

  async function onDelete() {
    setSaving(true)
    const { ok } = await run((api) => api.deletePerfume(perfume.id), 'Perfume eliminado')
    setSaving(false)
    setDeleting(false)
    if (ok) navigate('/admin/perfumes')
  }

  return (
    <form onSubmit={onSubmit} noValidate>
      <PageHeader title={isNew ? 'Nuevo perfume' : 'Editar perfume'} back="/admin/perfumes" />

      <div className="space-y-6">
        <section className={`${cardClass} space-y-5 p-5`}>
          <Field id="name" label="Nombre" error={nameError}>
            <input
              id="name"
              maxLength={60}
              aria-invalid={Boolean(nameError) || undefined}
              className={inputClass}
              {...text('name')}
            />
          </Field>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field id="size" label="Tamaño" optional hint="Por ejemplo: 100 ml.">
              <input id="size" maxLength={20} className={inputClass} {...text('size')} />
            </Field>
            <fieldset>
              <legend className="text-[0.9375rem] font-semibold">Para</legend>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {GENDERS.map((gender) => (
                  <label
                    key={gender.value}
                    className={`flex h-12 cursor-pointer items-center justify-center rounded-[3px] border text-sm font-semibold has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-gold ${
                      values.gender === gender.value ? 'border-ink bg-ink text-paper' : 'border-ink/30'
                    }`}
                  >
                    <input
                      type="radio"
                      name="gender"
                      value={gender.value}
                      checked={values.gender === gender.value}
                      onChange={() => set('gender')(gender.value)}
                      className="sr-only"
                    />
                    {gender.label}
                  </label>
                ))}
              </div>
            </fieldset>
          </div>
        </section>

        <section className={`${cardClass} p-5`}>
          <Switch checked={values.stock} onChange={set('stock')} label="Hay stock" />
          <div className="mt-1 border-t border-line pt-1">
            <Switch checked={values.active} onChange={set('active')} label="Visible en la tienda" />
          </div>
        </section>

        <section className={`${cardClass} p-5`}>
          <h2 className="font-display text-[1.5rem]">Promos en las que entra</h2>
          {data.promos.length === 0 ? (
            <p className="mt-2 text-mute-ink">Todavía no hay promos creadas.</p>
          ) : (
            <ul className="mt-2 divide-y divide-line">
              {data.promos.map((promo) => (
                <li key={promo.id}>
                  <label className="flex min-h-14 cursor-pointer items-center gap-3">
                    <input
                      type="checkbox"
                      checked={promoIds.has(promo.id)}
                      onChange={() => togglePromo(promo.id)}
                      className="size-5 shrink-0 accent-ink"
                    />
                    <span className="flex-1 font-semibold">{promo.title}</span>
                    {!promo.active && <span className="text-sm text-mute-ink">Pausada</span>}
                  </label>
                </li>
              ))}
            </ul>
          )}
          {data.promos.length > 0 && promoIds.size === 0 && (
            <p className="mt-3 text-sm text-mute-ink">Si no entra en ninguna promo, no aparece en la tienda.</p>
          )}
        </section>

        <section className={`${cardClass} space-y-5 p-5`}>
          <h2 className="font-display text-[1.5rem]">Foto</h2>
          <ImageInput
            value={values.image_url}
            onChange={set('image_url')}
            folder="perfumes"
            fallback={<Bottle shape={values.bottle_shape} tone={values.bottle_tone} className="h-[88%] w-auto" />}
          />
          {!values.image_url && (
            <div className="grid gap-5 sm:grid-cols-2">
              <Field id="bottle_shape" label="Ilustración, si no subís foto">
                <select id="bottle_shape" className={inputClass} {...text('bottle_shape')}>
                  {SHAPES.map((shape) => (
                    <option key={shape.value} value={shape.value}>
                      {shape.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field id="bottle_tone" label="Color">
                <select id="bottle_tone" className={inputClass} {...text('bottle_tone')}>
                  {TONES.map((tone) => (
                    <option key={tone.value} value={tone.value}>
                      {tone.label}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          )}
        </section>

        <section className={`${cardClass} space-y-5 p-5`}>
          <div>
            <h2 className="font-display text-[1.5rem]">Ficha</h2>
            <p className="mt-1 text-sm text-mute-ink">Opcional. Se ve cuando el cliente toca el perfume.</p>
          </div>
          <Field id="family" label="Familia olfativa" optional hint="Por ejemplo: floral, amaderado, fresco.">
            <input id="family" maxLength={30} className={inputClass} {...text('family')} />
          </Field>
          <div className="grid gap-5 sm:grid-cols-3">
            {NOTES.map((label, i) => (
              <Field key={label} id={`note-${i}`} label={`Nota de ${label.toLowerCase()}`} optional>
                <input
                  id={`note-${i}`}
                  maxLength={30}
                  value={values.notes[i]}
                  onChange={(e) => set('notes')(values.notes.map((note, j) => (j === i ? e.target.value : note)))}
                  className={inputClass}
                />
              </Field>
            ))}
          </div>
        </section>

        {!isNew && (
          <Button variant="danger" onClick={() => setDeleting(true)}>
            Eliminar perfume
          </Button>
        )}
      </div>

      <SaveBar saving={saving} cancelTo="/admin/perfumes" label={isNew ? 'Crear perfume' : 'Guardar cambios'} />

      <Confirm
        open={deleting}
        title={`¿Eliminar ${perfume?.name}?`}
        confirmLabel="Sí, eliminar"
        busy={saving}
        onConfirm={onDelete}
        onCancel={() => setDeleting(false)}
      >
        Se quita de todas las promos y no se puede recuperar. Si solo se terminó, marcalo sin stock.
      </Confirm>
    </form>
  )
}
