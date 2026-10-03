import { Minus, Plus } from 'lucide-react'

/** Control − cantidad + para un perfume que ya está en el combo. */
export default function Stepper({ name, count, onAdd, onRemove, canAdd }) {
  return (
    <div className="flex h-11 items-center justify-between rounded-[3px] border border-gold text-paper">
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Quitar una unidad de ${name}`}
        className="grid size-11 place-items-center transition-colors duration-150 hover:text-gold-bright active:scale-95"
      >
        <Minus size={16} strokeWidth={2} />
      </button>
      <span className="text-base font-bold tabular-nums" aria-label={`${count} en tu combo`}>
        {count}
      </span>
      <button
        type="button"
        onClick={onAdd}
        disabled={!canAdd}
        aria-label={`Agregar otra unidad de ${name}`}
        className="grid size-11 place-items-center transition-colors duration-150 hover:text-gold-bright active:scale-95 disabled:pointer-events-none disabled:opacity-35"
      >
        <Plus size={16} strokeWidth={2} />
      </button>
    </div>
  )
}
