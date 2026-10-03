import { useState } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { Mail, MapPin, Phone } from 'lucide-react'
import { money, orderNumber, when } from '../format.js'
import { useAdmin } from '../store.jsx'
import { Button, Confirm, PageHeader, STATUS_LABEL, StatusBadge, cardClass, inputClass } from '../ui.jsx'

// Paso siguiente natural de cada estado.
const NEXT = {
  pagado: { status: 'enviado', label: 'Marcar como enviado', done: 'Pedido marcado como enviado' },
  enviado: { status: 'entregado', label: 'Marcar como entregado', done: 'Pedido marcado como entregado' },
}

export default function OrderDetail() {
  const { id } = useParams()
  const { data, run } = useAdmin()
  const [busy, setBusy] = useState(false)
  const [confirming, setConfirming] = useState(false)

  const order = data.orders.find((o) => o.id === id)
  if (!order) return <Navigate to="/admin/pedidos" replace />

  const next = NEXT[order.status]
  const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${order.address}, ${order.city}`)}`

  async function setStatus(status, message) {
    setBusy(true)
    await run((api) => api.setOrderStatus(order.id, status), message)
    setBusy(false)
    setConfirming(false)
  }

  return (
    <>
      <PageHeader title={orderNumber(order.number)} back="/admin/pedidos">
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <StatusBadge status={order.status} />
          <span className="text-sm text-mute-ink">Pedido de {when(order.created_at)}</span>
        </div>
      </PageHeader>

      {order.status === 'pendiente' && (
        <p className="mb-4 rounded-md border border-line bg-paper-2 p-4 text-[0.9375rem]">
          Este pedido todavía no se pagó. No lo envíes hasta que figure como <strong>Para enviar</strong>.
        </p>
      )}

      {next && (
        <Button
          busy={busy}
          onClick={() => setStatus(next.status, next.done)}
          className="mb-6 w-full sm:w-auto sm:px-10"
        >
          {next.label}
        </Button>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <section className={`${cardClass} p-5`}>
          <h2 className="eyebrow text-gold-deep">Cliente</h2>
          <p className="mt-3 font-display text-[1.5rem] leading-tight">{order.customer_name}</p>
          <ul className="mt-3 space-y-1">
            <li>
              <a
                href={`tel:${order.customer_phone.replace(/[^\d+]/g, '')}`}
                className="inline-flex min-h-11 items-center gap-3 underline-offset-4 hover:underline"
              >
                <Phone size={18} strokeWidth={1.6} className="text-gold-deep" />
                {order.customer_phone}
              </a>
            </li>
            <li>
              <a
                href={`mailto:${order.customer_email}`}
                className="inline-flex min-h-11 items-center gap-3 break-all underline-offset-4 hover:underline"
              >
                <Mail size={18} strokeWidth={1.6} className="shrink-0 text-gold-deep" />
                {order.customer_email}
              </a>
            </li>
          </ul>
        </section>

        <section className={`${cardClass} p-5`}>
          <h2 className="eyebrow text-gold-deep">Entrega</h2>
          <p className="mt-3 font-display text-[1.5rem] leading-tight">{order.address}</p>
          {order.address_notes && <p className="mt-1 text-mute-ink">{order.address_notes}</p>}
          <p className="mt-1 text-mute-ink">{order.city}</p>
          <a
            href={mapUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-flex min-h-11 items-center gap-3 underline-offset-4 hover:underline"
          >
            <MapPin size={18} strokeWidth={1.6} className="text-gold-deep" />
            Ver en el mapa
          </a>
        </section>
      </div>

      <section className={`${cardClass} mt-4 p-5`}>
        <h2 className="eyebrow text-gold-deep">Qué lleva</h2>
        <ul className="mt-2">
          {order.items.map((item, i) => (
            <li key={i} className="flex justify-between gap-4 border-b border-line py-4">
              <div className="min-w-0">
                <p className="font-display text-[1.25rem] leading-tight">Promo {item.promo_title}</p>
                <ul className="mt-2 space-y-1 text-[0.9375rem]">
                  {item.perfumes.map((perfume, j) => (
                    <li key={j} className="flex gap-2">
                      <span aria-hidden="true" className="mt-2 size-1.5 shrink-0 rotate-45 bg-gold-deep" />
                      <span>
                        {perfume.name}
                        {perfume.size && <span className="text-mute-ink"> · {perfume.size}</span>}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
              <p className="shrink-0 font-semibold tabular-nums">{money(item.unit_price)}</p>
            </li>
          ))}
        </ul>
        <dl className="mt-4 space-y-1.5">
          <div className="flex justify-between text-mute-ink">
            <dt>Subtotal</dt>
            <dd className="tabular-nums">{money(order.subtotal)}</dd>
          </div>
          <div className="flex justify-between text-mute-ink">
            <dt>Envío</dt>
            <dd className="tabular-nums">{money(order.shipping_cost)}</dd>
          </div>
          <div className="flex items-baseline justify-between pt-1">
            <dt className="font-semibold">Total</dt>
            <dd className="price text-[2rem]">{money(order.total)}</dd>
          </div>
        </dl>
      </section>

      <section className={`${cardClass} mt-4 p-5`}>
        <h2 className="eyebrow text-gold-deep">Corregir estado</h2>
        <p className="mt-2 text-sm text-mute-ink">
          Solo si hace falta arreglar algo. El cliente no recibe ningún aviso.
        </p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <label className="flex-1">
            <span className="sr-only">Estado del pedido</span>
            <select
              value={order.status}
              disabled={busy}
              onChange={(e) => setStatus(e.target.value, 'Estado actualizado')}
              className={inputClass}
            >
              {Object.entries(STATUS_LABEL)
                .filter(([value]) => value !== 'cancelado' || order.status === 'cancelado')
                .map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
            </select>
          </label>
          {order.status !== 'cancelado' && (
            <Button variant="danger" onClick={() => setConfirming(true)}>
              Cancelar pedido
            </Button>
          )}
        </div>
      </section>

      <Confirm
        open={confirming}
        title="¿Cancelar este pedido?"
        confirmLabel="Sí, cancelar"
        busy={busy}
        onConfirm={() => setStatus('cancelado', 'Pedido cancelado')}
        onCancel={() => setConfirming(false)}
      >
        {order.status === 'pendiente'
          ? 'El pedido queda marcado como cancelado.'
          : 'El pedido queda marcado como cancelado. La devolución del dinero se hace aparte, desde Mercado Pago.'}
      </Confirm>
    </>
  )
}
