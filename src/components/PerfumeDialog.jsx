import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import PerfumeVisual from './PerfumeVisual.jsx'
import { GENDER_LABEL } from './PerfumeCard.jsx'
import Stepper from './Stepper.jsx'
import { money } from '../lib/format.js'

const NOTE_LABELS = ['Salida', 'Corazón', 'Fondo']

/**
 * Ficha de un perfume. Usa <dialog> nativo: atrapa el foco y se cierra con Escape;
 * al cerrar, el foco vuelve a la tarjeta. En celular se abre como hoja inferior.
 */
export default function PerfumeDialog({ perfume, promo, count, full, onAdd, onRemove, onClose }) {
  const ref = useRef(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog || !perfume) return
    const opener = document.activeElement // la tarjeta desde la que se abrió
    dialog.showModal()
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
      dialog.close()
      opener?.focus?.()
    }
  }, [perfume])

  if (!perfume) return null
  const { name, gender, size, family, stock } = perfume
  const notes = perfume.notes.map((note, i) => ({ label: NOTE_LABELS[i], note })).filter((n) => n.label && n.note)

  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
      onClick={(e) => e.target === ref.current && onClose()}
      aria-labelledby="perfume-titulo"
      className="perfume-dialog fixed inset-x-0 bottom-0 top-auto m-0 max-h-[92svh] w-full max-w-none overflow-y-auto rounded-t-xl border border-ink-3 bg-ink-2 p-0 text-paper backdrop:bg-ink/80 md:inset-0 md:m-auto md:h-fit md:max-w-3xl md:rounded-md"
    >
      <div className="grid md:grid-cols-2">
        <div className="relative isolate flex h-56 items-end justify-center overflow-hidden bg-ink px-8 pt-8 md:h-auto md:min-h-[26rem]">
          <span
            aria-hidden="true"
            className="absolute left-1/2 top-1/3 -z-10 aspect-square w-[70%] -translate-x-1/2 rounded-full bg-gold/25 blur-3xl"
          />
          <PerfumeVisual
            perfume={perfume}
            fill
            className={`${perfume.image ? '' : 'h-[88%] md:h-[20rem]'} ${stock ? '' : 'opacity-40 grayscale'}`}
          />
        </div>

        <div className="flex flex-col p-6 md:p-8">
          <div className="flex items-start justify-between gap-4">
            <p className="eyebrow pt-3 text-gold">{[GENDER_LABEL[gender], size].filter(Boolean).join(' · ')}</p>
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar"
              className="-mr-3 -mt-1 grid size-11 shrink-0 place-items-center text-mute transition-colors duration-150 hover:text-paper"
            >
              <X size={22} strokeWidth={1.6} />
            </button>
          </div>

          <h2 id="perfume-titulo" className="mt-1 text-[2.25rem] md:text-[2.75rem]">
            {name}
          </h2>
          {family && <p className="mt-3 text-mute">Familia olfativa: {family.toLowerCase()}.</p>}

          {notes.length > 0 && (
            <dl className="mt-6 border-t border-ink-3">
              {notes.map(({ label, note }) => (
                <div key={label} className="flex items-baseline justify-between border-b border-ink-3 py-3">
                  <dt className="eyebrow text-mute">{label}</dt>
                  <dd className="font-display text-[1.25rem]">{note}</dd>
                </div>
              ))}
            </dl>
          )}

          <p className="mt-6 text-sm text-mute">
            Entra en la promo {promo.title} por <span className="font-semibold text-paper">{money(promo.price)}</span>.
          </p>

          <div className="mt-6 md:mt-auto md:pt-8">
            {count > 0 ? (
              <Stepper name={name} count={count} onAdd={onAdd} onRemove={onRemove} canAdd={!full} />
            ) : (
              <button
                type="button"
                onClick={onAdd}
                disabled={full || !stock}
                className="btn btn-gold w-full disabled:pointer-events-none disabled:bg-ink-3 disabled:text-paper/75"
              >
                {!stock ? 'Sin stock' : full ? 'Combo completo' : 'Agregar al combo'}
              </button>
            )}
          </div>
        </div>
      </div>
    </dialog>
  )
}
