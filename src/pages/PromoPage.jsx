import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Search, X } from 'lucide-react'
import PerfumeCard from '../components/PerfumeCard.jsx'
import PerfumeDialog from '../components/PerfumeDialog.jsx'
import { ComboBar, ComboPanel } from '../components/ComboSummary.jsx'
import { useCatalog } from '../lib/catalog.jsx'
import { useCart } from '../lib/cart.jsx'
import { useCombo } from '../lib/useCombo.js'
import { money } from '../lib/format.js'
import NotFound from './NotFound.jsx'

const GENDERS = [
  { value: 'todos', label: 'Todos' },
  { value: 'hombre', label: 'Hombre' },
  { value: 'mujer', label: 'Mujer' },
  { value: 'unisex', label: 'Unisex' },
]

// Búsqueda sin distinguir mayúsculas ni acentos: "ambar" encuentra "Ámbar".
const normalize = (text) => text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

export default function PromoPage() {
  const { slug } = useParams()
  const promo = useCatalog().getPromo(slug)
  if (!promo) return <NotFound />
  // key: al cambiar de promo se reinician la selección y los filtros.
  return <ComboBuilder key={promo.slug} promo={promo} />
}

function ComboBuilder({ promo }) {
  const { addCombo } = useCart()
  const { getPerfume, getPerfumesByPromo } = useCatalog()
  const combo = useCombo(promo.quantity)
  const [gender, setGender] = useState('todos')
  const [query, setQuery] = useState('')
  const [detailId, setDetailId] = useState(null)

  useEffect(() => {
    window.scrollTo(0, 0)
    document.title = `${promo.title} · Giorgio Perfumería`
    return () => {
      document.title = 'Giorgio Perfumería · Promos de perfumes en Corrientes'
    }
  }, [promo])

  const all = useMemo(() => getPerfumesByPromo(promo.slug), [getPerfumesByPromo, promo.slug])
  // Solo se muestran los filtros que tienen al menos un perfume en esta promo.
  const genders = useMemo(
    () => GENDERS.filter((g) => g.value === 'todos' || all.some((p) => p.gender === g.value)),
    [all],
  )

  const visible = useMemo(() => {
    const q = normalize(query.trim())
    return all.filter(
      (p) =>
        (gender === 'todos' || p.gender === gender) &&
        (!q || normalize(`${p.name} ${p.family} ${p.notes.join(' ')}`).includes(q)),
    )
  }, [all, gender, query])

  const confirm = () => {
    if (!combo.full) return
    addCombo(promo.slug, combo.selection)
    combo.clear()
  }

  const detail = detailId ? getPerfume(detailId) : null

  return (
    <section className="min-h-svh bg-ink pt-[4.5rem]">
      <div className="mx-auto max-w-[90rem] px-5 md:px-10">
        {/* Cabecera de la promo */}
        <header className="border-b border-ink-3 pb-8 pt-6 md:pb-12 md:pt-10">
          <Link
            to="/"
            className="inline-flex min-h-11 items-center gap-2 text-[0.8125rem] font-semibold uppercase tracking-[0.14em] text-mute transition-colors duration-200 hover:text-gold-bright"
          >
            <ArrowLeft size={16} strokeWidth={2} />
            Todas las promos
          </Link>

          <div className="mt-5 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="eyebrow text-gold">Promo · {promo.detail}</p>
              <h1 className="mt-4 text-[clamp(2.75rem,7vw,5.5rem)]">{promo.name}</h1>
            </div>
            <div className="flex items-end justify-between gap-6 lg:block lg:text-right">
              <p className="price text-[clamp(2.75rem,6vw,4.5rem)] text-gold-bright">{money(promo.price)}</p>
              <p className="max-w-[11rem] text-right text-sm text-mute lg:mt-3 lg:max-w-none lg:text-base">
                Elegí {promo.quantity} perfumes. Podés repetir o combinar.
              </p>
            </div>
          </div>
        </header>

        <div className="grid gap-10 lg:grid-cols-12">
          <div className="min-w-0 pb-10 lg:col-span-8 lg:pb-24 xl:col-span-9">
            {/* Filtros: desde tablet quedan a la vista al hacer scroll */}
            <div className="top-[4.5rem] z-20 -mx-5 flex flex-col gap-3 bg-ink/95 px-5 py-4 md:sticky md:-mx-10 md:backdrop-blur-md md:flex-row md:items-center md:justify-between md:px-10 lg:mx-0 lg:px-0">
              <div
                role="group"
                aria-label="Filtrar por género"
                className="-mx-5 flex gap-2 overflow-x-auto px-5 md:mx-0 md:px-0"
              >
                {genders.map((g) => (
                  <button
                    key={g.value}
                    type="button"
                    aria-pressed={gender === g.value}
                    onClick={() => setGender(g.value)}
                    className={`h-11 shrink-0 rounded-full border px-5 text-sm font-semibold transition-colors duration-150 ${
                      gender === g.value
                        ? 'border-paper bg-paper text-ink'
                        : 'border-ink-3 text-paper hover:border-gold hover:text-gold-bright'
                    }`}
                  >
                    {g.label}
                  </button>
                ))}
              </div>

              <label className="relative block md:w-72">
                <span className="sr-only">Buscar perfume</span>
                <Search
                  size={18}
                  strokeWidth={1.6}
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-mute"
                />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar por nombre o nota"
                  className="h-11 w-full rounded-full border border-ink-3 bg-ink-2 pl-11 pr-11 text-base text-paper placeholder:text-mute/80 focus:border-gold focus:outline-none [&::-webkit-search-cancel-button]:hidden"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => setQuery('')}
                    aria-label="Borrar búsqueda"
                    className="absolute right-0 top-0 grid size-11 place-items-center text-mute hover:text-paper"
                  >
                    <X size={16} strokeWidth={2} />
                  </button>
                )}
              </label>
            </div>

            <h2 className="sr-only">Perfumes de la promo</h2>
            <p className="mt-2 text-sm text-mute" aria-live="polite">
              {visible.length} {visible.length === 1 ? 'perfume' : 'perfumes'}
            </p>

            {visible.length > 0 ? (
              <ul className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 xl:grid-cols-4">
                {visible.map((perfume) => (
                  <li key={perfume.id}>
                    <PerfumeCard
                      perfume={perfume}
                      count={combo.counts[perfume.id] ?? 0}
                      full={combo.full}
                      onAdd={() => combo.add(perfume.id)}
                      onRemove={() => combo.remove(perfume.id)}
                      onOpen={() => setDetailId(perfume.id)}
                    />
                  </li>
                ))}
              </ul>
            ) : (
              <div className="mt-4 rounded-md border border-dashed border-ink-3 px-6 py-16 text-center">
                <p className="font-display text-[1.75rem]">
                  {all.length === 0 ? 'Todavía no hay perfumes en esta promo' : 'No encontramos ese perfume'}
                </p>
                <p className="mt-2 text-mute">
                  {all.length === 0
                    ? 'Estamos cargando las fragancias. Volvé a entrar en un rato.'
                    : 'Probá con otro nombre o mirá todos los de la promo.'}
                </p>
                {all.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setQuery('')
                      setGender('todos')
                    }}
                    className="btn btn-ghost mt-6"
                  >
                    Ver todos
                  </button>
                )}
              </div>
            )}
          </div>

          <aside aria-label="Tu combo" className="hidden pb-24 pt-4 lg:col-span-4 lg:block xl:col-span-3">
            <ComboPanel promo={promo} combo={combo} onConfirm={confirm} />
          </aside>
        </div>
      </div>

      <ComboBar promo={promo} combo={combo} onConfirm={confirm} />

      <PerfumeDialog
        perfume={detail}
        promo={promo}
        count={detail ? (combo.counts[detail.id] ?? 0) : 0}
        full={combo.full}
        onAdd={() => combo.add(detail.id)}
        onRemove={() => combo.remove(detail.id)}
        onClose={() => setDetailId(null)}
      />
    </section>
  )
}
