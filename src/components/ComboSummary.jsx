import { X } from 'lucide-react'
import PerfumeVisual from './PerfumeVisual.jsx'
import { useCatalog } from '../lib/catalog.jsx'
import { money } from '../lib/format.js'

const missingLabel = (missing) => (missing === 1 ? 'Te falta 1 perfume' : `Te faltan ${missing} perfumes`)

function AddButton({ full, missing, onConfirm, className = '' }) {
  return (
    <button
      type="button"
      onClick={onConfirm}
      disabled={!full}
      className={`btn btn-gold w-full disabled:pointer-events-none disabled:bg-ink-3 disabled:text-paper/75 ${className}`}
    >
      {full ? 'Agregar al carrito' : missingLabel(missing)}
    </button>
  )
}

/** Resumen del combo para escritorio: panel fijo a la derecha de la grilla. */
export function ComboPanel({ promo, combo, onConfirm }) {
  const { getPerfume } = useCatalog()
  const { selection, missing, full, removeAt } = combo
  const slots = Array.from({ length: promo.quantity }, (_, i) => selection[i])

  return (
    <div className="sticky top-24 rounded-md border border-ink-3 bg-ink-2 p-6">
      <div className="flex items-baseline justify-between">
        <h2 className="font-display text-[1.75rem]">Tu combo</h2>
        <p className="text-sm text-mute" aria-live="polite">
          {selection.length} de {promo.quantity}
        </p>
      </div>

      <div aria-hidden="true" className="mt-4 h-0.5 overflow-hidden bg-ink-3">
        <div
          className="h-full origin-left bg-gold transition-transform duration-300 ease-out-quint"
          style={{ transform: `scaleX(${selection.length / promo.quantity})` }}
        />
      </div>

      <ol className="mt-5 space-y-2">
        {slots.map((id, i) => {
          const perfume = id && getPerfume(id)
          return perfume ? (
            <li key={i} className="flex items-center gap-3 rounded-[3px] border border-ink-3 bg-ink py-2 pl-3 pr-1">
              <PerfumeVisual perfume={perfume} className="h-11 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-display text-[1.125rem] leading-tight">{perfume.name}</p>
                <p className="text-xs text-mute">{perfume.size}</p>
              </div>
              <button
                type="button"
                onClick={() => removeAt(i)}
                aria-label={`Quitar ${perfume.name} del combo`}
                className="grid size-11 shrink-0 place-items-center text-mute transition-colors duration-150 hover:text-paper"
              >
                <X size={18} strokeWidth={1.6} />
              </button>
            </li>
          ) : (
            <li
              key={i}
              className="flex h-[3.75rem] items-center rounded-[3px] border border-dashed border-ink-3 px-4 text-sm text-mute"
            >
              Perfume {i + 1}
            </li>
          )
        })}
      </ol>

      <div className="mt-6 flex items-baseline justify-between border-t border-ink-3 pt-5">
        <span className="text-sm text-mute">Precio de la promo</span>
        <span className="price text-[2rem] text-gold-bright">{money(promo.price)}</span>
      </div>

      <AddButton full={full} missing={missing} onConfirm={onConfirm} className="mt-5" />
    </div>
  )
}

/** Resumen del combo para celular y tablet: barra pegada al borde inferior. */
export function ComboBar({ promo, combo, onConfirm }) {
  const { getPerfume } = useCatalog()
  const { selection, missing, full, removeAt } = combo
  const slots = Array.from({ length: promo.quantity }, (_, i) => selection[i])

  return (
    <div className="sticky bottom-0 z-30 border-t border-ink-3 bg-ink/95 px-5 pb-[max(0.875rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-md lg:hidden">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm leading-tight">
          <span className="block font-semibold text-paper">Tu combo</span>
          <span className="text-mute" aria-live="polite">
            {selection.length} de {promo.quantity}
          </span>
        </p>
        <ol className="flex gap-1">
          {slots.map((id, i) => {
            const perfume = id && getPerfume(id)
            return (
              <li key={i}>
                {perfume ? (
                  <button
                    type="button"
                    onClick={() => removeAt(i)}
                    aria-label={`Quitar ${perfume.name} del combo`}
                    className="relative grid size-11 place-items-center overflow-visible rounded-full border border-gold bg-ink-2 active:scale-95"
                  >
                    <PerfumeVisual perfume={perfume} className={perfume.image ? 'size-full rounded-full' : 'h-7'} />
                    <span className="absolute -right-0.5 -top-0.5 grid size-4 place-items-center rounded-full bg-paper text-ink">
                      <X size={10} strokeWidth={3} />
                    </span>
                  </button>
                ) : (
                  <span className="grid size-11 place-items-center rounded-full border border-dashed border-ink-3 text-xs text-mute">
                    {i + 1}
                  </span>
                )}
              </li>
            )
          })}
        </ol>
      </div>
      <AddButton full={full} missing={missing} onConfirm={onConfirm} className="mt-3" />
    </div>
  )
}
