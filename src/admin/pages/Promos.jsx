import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown, ChevronUp, Plus, Star } from 'lucide-react'
import { money } from '../format.js'
import { useAdmin } from '../store.jsx'
import { Empty, PageHeader, Switch, Thumb, cardClass } from '../ui.jsx'

export default function Promos() {
  const { data, run } = useAdmin()
  const [busyId, setBusyId] = useState(null)
  const { promos, links } = data

  const perfumesIn = (id) => links.filter((l) => l.promo_id === id).length

  async function toggle(promo, active) {
    setBusyId(promo.id)
    await run((api) => api.patchPromo(promo.id, { active }), active ? 'Promo activada' : 'Promo pausada')
    setBusyId(null)
  }

  // Mueve la promo un lugar y vuelve a numerar: así el orden nunca queda con huecos ni empates.
  async function move(index, direction) {
    const order = [...promos]
    const [moved] = order.splice(index, 1)
    order.splice(index + direction, 0, moved)
    setBusyId(moved.id)
    await run(async (api) => {
      for (const [position, promo] of order.entries()) {
        if (promo.position !== position) await api.patchPromo(promo.id, { position })
      }
    })
    setBusyId(null)
  }

  return (
    <>
      <PageHeader
        title="Promos"
        action={
          <Link
            to="/admin/promos/nueva"
            className="inline-flex min-h-12 items-center gap-2 rounded-[3px] bg-ink px-5 text-[0.8125rem] font-bold uppercase tracking-[0.1em] text-paper"
          >
            <Plus size={16} strokeWidth={2.4} />
            Nueva
          </Link>
        }
      />

      {promos.length === 0 ? (
        <Empty title="Todavía no hay promos">
          <p>Creá la primera con el botón Nueva.</p>
        </Empty>
      ) : (
        <ul className="space-y-3">
          {promos.map((promo, index) => {
            const count = perfumesIn(promo.id)
            return (
              <li key={promo.id} className={`${cardClass} p-4 ${promo.active ? '' : 'bg-paper-2/60'}`}>
                <div className="flex items-center gap-4">
                  <Thumb image={promo.image_url} art={promo.art} className="size-16" />
                  <Link to={`/admin/promos/${promo.id}`} className="min-w-0 flex-1 py-1">
                    <span className="flex items-center gap-2">
                      <span className="truncate font-display text-[1.375rem] leading-tight">{promo.title}</span>
                      {promo.featured && (
                        <Star
                          size={15}
                          strokeWidth={2}
                          className="shrink-0 fill-gold text-gold-deep"
                          aria-label="Destacada"
                        />
                      )}
                    </span>
                    <span className="mt-1 block text-sm text-mute-ink">
                      <span className="font-bold tabular-nums text-ink">{money(promo.price)}</span> · elige{' '}
                      {promo.quantity} ·{' '}
                      <span className={count === 0 ? 'font-semibold text-danger' : ''}>
                        {count === 0 ? 'sin perfumes' : `${count} ${count === 1 ? 'perfume' : 'perfumes'}`}
                      </span>
                    </span>
                  </Link>
                  <span className="hidden text-sm font-semibold underline underline-offset-4 sm:block">
                    <Link to={`/admin/promos/${promo.id}`}>Editar</Link>
                  </span>
                </div>

                <div className="mt-3 flex items-center justify-between border-t border-line pt-2">
                  <span className="flex items-center gap-3">
                    <Switch
                      compact
                      checked={promo.active}
                      disabled={busyId === promo.id}
                      onChange={(value) => toggle(promo, value)}
                      label={`${promo.title}: visible en la tienda`}
                    />
                    <span className="text-sm text-mute-ink">{promo.active ? 'Visible en la tienda' : 'Pausada'}</span>
                  </span>
                  <span className="flex">
                    <button
                      type="button"
                      onClick={() => move(index, -1)}
                      disabled={index === 0 || busyId !== null}
                      aria-label={`Subir ${promo.title}`}
                      className="grid size-11 place-items-center text-mute-ink hover:text-ink disabled:opacity-30"
                    >
                      <ChevronUp size={20} strokeWidth={1.8} />
                    </button>
                    <button
                      type="button"
                      onClick={() => move(index, 1)}
                      disabled={index === promos.length - 1 || busyId !== null}
                      aria-label={`Bajar ${promo.title}`}
                      className="grid size-11 place-items-center text-mute-ink hover:text-ink disabled:opacity-30"
                    >
                      <ChevronDown size={20} strokeWidth={1.8} />
                    </button>
                  </span>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </>
  )
}
