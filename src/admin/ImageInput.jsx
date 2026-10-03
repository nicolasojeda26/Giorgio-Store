import { useRef, useState } from 'react'
import { ImagePlus, Trash2 } from 'lucide-react'
import { prepareImage } from './image.js'
import { useAdmin } from './store.jsx'
import { Button } from './ui.jsx'

/**
 * Foto de una promo o de un perfume. Al elegirla se achica en el celular y se sube;
 * `fallback` es lo que se ve cuando no hay foto (la ilustración).
 */
export default function ImageInput({ value, onChange, folder, fallback }) {
  const { api, notify } = useAdmin()
  const input = useRef(null)
  const [busy, setBusy] = useState(false)

  async function onFile(event) {
    const file = event.target.files?.[0]
    event.target.value = '' // permite volver a elegir el mismo archivo
    if (!file) return
    setBusy(true)
    try {
      onChange(await api.uploadImage(await prepareImage(file), folder))
    } catch (error) {
      notify(error.code ? error.message : 'No se pudo usar esa imagen. Probá con otra.', 'error')
    }
    setBusy(false)
  }

  return (
    <div className="flex items-center gap-4">
      <span className="grid size-24 shrink-0 place-items-end justify-center overflow-hidden rounded-[3px] bg-ink">
        {value ? <img src={value} alt="Foto actual" className="size-full object-cover" /> : fallback}
      </span>
      <div className="flex flex-col items-start gap-2">
        <input
          ref={input}
          type="file"
          accept="image/*"
          onChange={onFile}
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
        />
        <Button variant="secondary" busy={busy} onClick={() => input.current?.click()}>
          {!busy && <ImagePlus size={16} strokeWidth={2} />}
          {value ? 'Cambiar foto' : 'Subir foto'}
        </Button>
        {value && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-mute-ink hover:text-danger"
          >
            <Trash2 size={15} strokeWidth={2} />
            Quitar foto
          </button>
        )}
      </div>
    </div>
  )
}
