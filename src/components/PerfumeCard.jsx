import PerfumeVisual from './PerfumeVisual.jsx'
import Stepper from './Stepper.jsx'

export const GENDER_LABEL = { hombre: 'Hombre', mujer: 'Mujer', unisex: 'Unisex' }

/** Tarjeta de un perfume dentro de una promo: se puede ver el detalle y sumarlo al combo. */
export default function PerfumeCard({ perfume, count, full, onAdd, onRemove, onOpen }) {
  const { name, gender, size, notes, stock } = perfume
  const selected = count > 0

  return (
    <article
      className={`relative flex h-full flex-col overflow-hidden rounded-md border bg-ink-2 transition-colors duration-200 ${
        selected ? 'border-gold' : 'border-ink-3'
      }`}
    >
      <button
        type="button"
        onClick={onOpen}
        aria-label={`Ver detalle de ${name}`}
        className="group relative isolate flex aspect-[4/5] w-full items-end justify-center overflow-hidden px-6 pt-7"
      >
        <span
          aria-hidden="true"
          className={`absolute left-1/2 top-[30%] -z-10 aspect-square w-[78%] -translate-x-1/2 rounded-full bg-gold/20 blur-2xl transition-opacity duration-300 ${
            selected ? 'opacity-100' : 'opacity-55 group-hover:opacity-100'
          }`}
        />
        <PerfumeVisual
          perfume={perfume}
          fill
          className={`transition-transform duration-300 ease-out-quint ${
            perfume.image ? 'group-hover:scale-[1.03]' : 'h-[86%] group-hover:-translate-y-1'
          } ${stock ? '' : 'opacity-40 grayscale'}`}
        />
      </button>

      {selected && (
        <span className="pointer-events-none absolute right-3 top-3 grid h-7 min-w-7 place-items-center rounded-full bg-gold px-2 text-sm font-bold text-ink">
          ×{count}
        </span>
      )}
      {!stock && (
        <span className="eyebrow pointer-events-none absolute left-3 top-3 rounded-[3px] bg-paper px-2 py-1 text-[0.625rem] text-ink">
          Sin stock
        </span>
      )}

      <div className="flex flex-1 flex-col p-4">
        <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.16em] text-mute">
          {[GENDER_LABEL[gender], size].filter(Boolean).join(' · ')}
        </p>
        <h3 className="mt-2 font-display text-[1.3125rem] leading-[1.1] tracking-[-0.01em] md:text-[1.5rem]">{name}</h3>
        <p className="mt-1.5 text-sm leading-snug text-mute">{notes.join(' · ')}</p>

        <div className="mt-auto pt-4">
          {selected ? (
            <Stepper name={name} count={count} onAdd={onAdd} onRemove={onRemove} canAdd={!full} />
          ) : (
            <button
              type="button"
              onClick={onAdd}
              disabled={full || !stock}
              className="h-11 w-full rounded-[3px] border border-ink-3 text-[0.8125rem] font-bold uppercase tracking-[0.12em] text-paper transition-[background-color,border-color,color,transform] duration-200 ease-out-quint hover:border-gold hover:bg-gold hover:text-ink active:scale-[0.97] disabled:pointer-events-none disabled:border-ink-3 disabled:text-mute/70"
            >
              {!stock ? 'Sin stock' : full ? 'Combo completo' : 'Agregar'}
            </button>
          )}
        </div>
      </div>
    </article>
  )
}
