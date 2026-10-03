import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search } from 'lucide-react'
import { GENDER_LABEL } from '../format.js'
import { useAdmin } from '../store.jsx'
import { Chips, Empty, PageHeader, Switch, Thumb, cardClass, inputClass } from '../ui.jsx'

const normalize = (text) => text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

export default function Perfumes() {
  const { data, run } = useAdmin()
  const [filter, setFilter] = useState('todos')
  const [query, setQuery] = useState('')
  const [busyId, setBusyId] = useState(null)
  const { perfumes, promos, links } = data

  const promoNames = (id) =>
    links
      .filter((l) => l.perfume_id === id)
      .map((l) => promos.find((p) => p.id === l.promo_id)?.title)
      .filter(Boolean)

  const filters = [
    { value: 'todos', label: 'Todos', test: () => true },
    { value: 'sin_stock', label: 'Sin stock', test: (p) => !p.stock },
    { value: 'sin_promo', label: 'Sin promo', test: (p) => !links.some((l) => l.perfume_id === p.id) },
  ]
  const visible = useMemo(() => {
    const q = normalize(query.trim())
    const test = filters.find((f) => f.value === filter).test
    return perfumes.filter((p) => test(p) && (!q || normalize(`${p.name} ${p.size} ${p.family}`).includes(q)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [perfumes, links, filter, query])

  async function toggleStock(perfume, stock) {
    setBusyId(perfume.id)
    await run(
      (api) => api.patchPerfume(perfume.id, { stock }),
      stock ? `${perfume.name}: con stock` : `${perfume.name}: sin stock`,
    )
    setBusyId(null)
  }

  return (
    <>
      <PageHeader
        title="Perfumes"
        action={
          <Link
            to="/admin/perfumes/nuevo"
            className="inline-flex min-h-12 items-center gap-2 rounded-[3px] bg-ink px-5 text-[0.8125rem] font-bold uppercase tracking-[0.1em] text-paper"
          >
            <Plus size={16} strokeWidth={2.4} />
            Nuevo
          </Link>
        }
      />

      <label className="relative block">
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
          placeholder="Buscar por nombre"
          className={`${inputClass} pl-10`}
        />
      </label>
      <div className="mt-3">
        <Chips
          label="Filtrar perfumes"
          value={filter}
          onChange={setFilter}
          options={filters.map((f) => ({ value: f.value, label: f.label, count: perfumes.filter(f.test).length }))}
        />
      </div>

      {visible.length === 0 ? (
        <div className="mt-5">
          <Empty title={perfumes.length === 0 ? 'Todavía no hay perfumes' : 'Ningún perfume coincide'}>
            {perfumes.length === 0 && <p>Cargá el primero con el botón Nuevo.</p>}
          </Empty>
        </div>
      ) : (
        <ul className="mt-5 space-y-2">
          {visible.map((perfume) => {
            const names = promoNames(perfume.id)
            return (
              <li
                key={perfume.id}
                className={`${cardClass} flex items-center gap-3 p-3 ${perfume.active ? '' : 'bg-paper-2/60'}`}
              >
                <Link to={`/admin/perfumes/${perfume.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                  <Thumb
                    image={perfume.image_url}
                    bottle={{ shape: perfume.bottle_shape, tone: perfume.bottle_tone }}
                  />
                  <span className="min-w-0">
                    <span className="block truncate font-display text-[1.25rem] leading-tight">{perfume.name}</span>
                    <span className="mt-0.5 block truncate text-sm text-mute-ink">
                      {[perfume.size, GENDER_LABEL[perfume.gender], !perfume.active && 'oculto']
                        .filter(Boolean)
                        .join(' · ')}
                    </span>
                    <span
                      className={`mt-0.5 block truncate text-sm ${names.length ? 'text-mute-ink' : 'font-semibold text-danger'}`}
                    >
                      {names.length ? names.join(', ') : 'No está en ninguna promo'}
                    </span>
                  </span>
                </Link>
                <span className="flex shrink-0 flex-col items-center">
                  <Switch
                    compact
                    checked={perfume.stock}
                    disabled={busyId === perfume.id}
                    onChange={(value) => toggleStock(perfume, value)}
                    label={`${perfume.name}: hay stock`}
                  />
                  <span className="text-xs text-mute-ink">{perfume.stock ? 'Con stock' : 'Sin stock'}</span>
                </span>
              </li>
            )
          })}
        </ul>
      )}
    </>
  )
}
