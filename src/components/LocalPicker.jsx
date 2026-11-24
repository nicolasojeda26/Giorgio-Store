import { MapPin } from 'lucide-react'
import { useApp } from '../lib/app.jsx'

/**
 * El dueño elige con qué local trabaja (o ve los dos juntos). Encargados y vendedores ven el nombre del suyo.
 * Va sobre fondo negro (barra lateral y barra de arriba en el celular).
 */
export default function LocalPicker({ id, compact = false }) {
  const { dueno, sucursal, setSucursal, activas, nombreLocal } = useApp()
  if (!dueno) {
    return (
      <p className={`flex min-w-0 items-center gap-1.5 text-sm text-paper ${compact ? '' : 'px-3'}`}>
        <MapPin size={15} strokeWidth={1.8} className="shrink-0 text-gold" aria-hidden="true" />
        <span className="truncate">{nombreLocal(sucursal)}</span>
      </p>
    )
  }
  return (
    <div className="relative min-w-0">
      <label htmlFor={id} className="sr-only">
        Local
      </label>
      <MapPin
        size={15}
        strokeWidth={1.8}
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gold"
        aria-hidden="true"
      />
      <select
        id={id}
        value={sucursal}
        onChange={(e) => setSucursal(e.target.value)}
        className={`min-h-11 w-full appearance-none truncate rounded-[3px] border border-ink-3 bg-ink-2 pl-8 pr-8 text-sm font-semibold text-paper focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold ${
          compact ? 'max-w-[11rem]' : ''
        }`}
      >
        <option value="">Todos los locales</option>
        {activas.map((x) => (
          <option key={x.id} value={x.id}>
            {x.nombre}
          </option>
        ))}
      </select>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[0.625rem] text-paper/70"
      >
        ▼
      </span>
    </div>
  )
}
