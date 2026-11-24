import { ChevronLeft, ChevronRight } from 'lucide-react'
import { monthTitle, shiftMonth, thisMonth } from '../lib/format.js'

/** Selector de mes: ‹ noviembre de 2026 › (no deja pasar del mes actual). */
export default function MonthPicker({ value, onChange }) {
  const actual = thisMonth()
  const button =
    'grid size-11 place-items-center rounded-full border border-ink/25 hover:border-ink disabled:opacity-30'
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        className={button}
        onClick={() => onChange(shiftMonth(value, -1))}
        aria-label="Mes anterior"
      >
        <ChevronLeft size={18} strokeWidth={2} />
      </button>
      <p className="min-w-[11rem] text-center font-semibold" aria-live="polite">
        {monthTitle(value)}
      </p>
      <button
        type="button"
        className={button}
        onClick={() => onChange(shiftMonth(value, 1))}
        disabled={value >= actual}
        aria-label="Mes siguiente"
      >
        <ChevronRight size={18} strokeWidth={2} />
      </button>
    </div>
  )
}
