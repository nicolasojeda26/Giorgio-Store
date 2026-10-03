import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight, RotateCcw } from 'lucide-react'
import { money, orderNumber, when } from '../format.js'
import { useAdmin } from '../store.jsx'
import { Chips, Empty, PageHeader, StatusBadge, cardClass } from '../ui.jsx'

const FILTERS = [
  { value: 'pagado', label: 'Para enviar', empty: 'No hay pedidos para enviar' },
  { value: 'enviado', label: 'Enviados', empty: 'No hay pedidos en camino' },
  { value: 'entregado', label: 'Entregados', empty: 'Todavía no hay pedidos entregados' },
  { value: 'todos', label: 'Todos', empty: 'Todavía no hay pedidos' },
]

export default function Orders() {
  const { data, reload } = useAdmin()
  const [filter, setFilter] = useState('pagado')
  const [refreshing, setRefreshing] = useState(false)

  const countOf = (value) =>
    value === 'todos' ? data.orders.length : data.orders.filter((o) => o.status === value).length
  const orders = filter === 'todos' ? data.orders : data.orders.filter((o) => o.status === filter)
  const current = FILTERS.find((f) => f.value === filter)

  async function refresh() {
    setRefreshing(true)
    await reload()
    setRefreshing(false)
  }

  return (
    <>
      <PageHeader
        title="Pedidos"
        action={
          <button
            type="button"
            onClick={refresh}
            disabled={refreshing}
            className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-mute-ink hover:text-ink disabled:opacity-60"
          >
            <RotateCcw size={16} strokeWidth={2} className={refreshing ? 'animate-spin' : ''} />
            Actualizar
          </button>
        }
      />

      <Chips
        label="Filtrar pedidos"
        value={filter}
        onChange={setFilter}
        options={FILTERS.map((f) => ({ value: f.value, label: f.label, count: countOf(f.value) }))}
      />

      {orders.length === 0 ? (
        <div className="mt-5">
          <Empty title={current.empty}>
            {filter === 'pagado' && <p>Cuando alguien pague, el pedido aparece acá.</p>}
          </Empty>
        </div>
      ) : (
        <ul className="mt-5 space-y-3">
          {orders.map((order) => (
            <li key={order.id}>
              <Link
                to={`/admin/pedidos/${order.id}`}
                className={`${cardClass} flex items-center gap-3 p-4 transition-colors duration-150 hover:border-ink/50`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="font-bold tabular-nums">{orderNumber(order.number)}</span>
                    <span className="text-sm text-mute-ink">{when(order.created_at)}</span>
                  </div>
                  <p className="mt-1.5 truncate font-display text-[1.25rem] leading-tight">{order.customer_name}</p>
                  <p className="mt-1 truncate text-sm text-mute-ink">
                    {order.items.map((item) => item.promo_title).join(' + ')} · {order.address}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  <StatusBadge status={order.status} />
                  <span className="font-bold tabular-nums">{money(order.total)}</span>
                </div>
                <ChevronRight size={18} strokeWidth={1.6} className="shrink-0 text-mute-ink" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
