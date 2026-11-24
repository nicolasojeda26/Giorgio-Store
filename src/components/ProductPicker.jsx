import { useId, useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { inputClass } from './ui.jsx'

const normalize = (s) =>
  String(s ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()

/** Buscador de productos por nombre o código: lista los que coinciden y avisa con onPick. */
export default function ProductPicker({ productos, onPick, label = 'Buscar producto', showStock = true }) {
  const id = useId()
  const [query, setQuery] = useState('')
  const matches = useMemo(() => {
    const q = normalize(query.trim())
    if (!q) return []
    return productos
      .filter((p) => p.activo && (normalize(p.nombre).includes(q) || normalize(p.codigo) === q))
      .slice(0, 8)
  }, [productos, query])

  const pick = (p) => {
    onPick(p)
    setQuery('')
  }

  return (
    <div className="relative">
      <label htmlFor={id} className="text-[0.9375rem] font-semibold">
        {label}
      </label>
      <div className="relative mt-2">
        <Search
          size={18}
          strokeWidth={1.8}
          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-mute-ink"
        />
        <input
          id={id}
          type="search"
          autoComplete="off"
          placeholder="Nombre o código"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              if (matches[0]) pick(matches[0])
            }
          }}
          className={`${inputClass} pl-10`}
        />
      </div>
      {query.trim() && (
        <ul className="mt-2 overflow-hidden rounded-md border border-line bg-white" aria-label="Resultados">
          {matches.length === 0 && <li className="px-4 py-3 text-mute-ink">No hay productos con ese nombre.</li>}
          {matches.map((p) => (
            <li key={p.id} className="border-b border-line last:border-0">
              <button
                type="button"
                onClick={() => pick(p)}
                className="flex min-h-12 w-full items-center justify-between gap-3 px-4 py-2 text-left hover:bg-paper-2"
              >
                <span className="min-w-0">
                  <span className="block truncate font-semibold">{p.nombre}</span>
                  {p.presentacion && <span className="text-sm text-mute-ink">{p.presentacion}</span>}
                </span>
                {showStock && (
                  <span className={`shrink-0 text-sm tabular-nums ${p.stock <= 0 ? 'text-danger' : 'text-mute-ink'}`}>
                    Stock {p.stock}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
