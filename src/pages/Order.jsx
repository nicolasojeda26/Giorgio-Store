import { useEffect, useRef, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { Check, Clock, LoaderCircle, X } from 'lucide-react'
import { site } from '../config/site.js'
import { useCart } from '../lib/cart.jsx'
import { useCatalog } from '../lib/catalog.jsx'
import { money } from '../lib/format.js'
import { fetchOrder } from '../lib/orders.js'
import { usePageTitle } from '../lib/usePageTitle.js'

const PAID = ['pagado', 'enviado', 'entregado']
const POLL_MS = 4000
const POLL_MAX = 15 // un minuto esperando la confirmación del pago

/** Qué pantalla mostrar según el estado del pedido y lo que informó Mercado Pago al volver. */
function viewOf(order, mpStatus) {
  if (PAID.includes(order.status)) return 'pagado'
  if (order.status === 'cancelado') return 'cancelado'
  if (order.paymentFailed || ['rejected', 'failure'].includes(mpStatus)) return 'rechazado'
  if (order.paymentStatus || ['pending', 'in_process', 'approved'].includes(mpStatus)) return 'confirmando'
  return 'sin_pagar'
}

function Badge({ tone, children }) {
  const tones = {
    gold: 'border-gold text-gold-bright',
    mute: 'border-ink-3 text-mute',
    danger: 'border-danger-bright text-danger-bright',
  }
  return <span className={`grid size-20 place-items-center rounded-full border ${tones[tone]}`}>{children}</span>
}

function Summary({ order }) {
  return (
    <div className="mt-10 rounded-md border border-ink-3 bg-ink-2 p-6 text-left md:p-8">
      <ul>
        {order.items.map((item, i) => (
          <li key={i} className="flex justify-between gap-4 border-b border-ink-3 pb-4 [&:not(:first-child)]:pt-4">
            <div className="min-w-0">
              <p className="font-display text-[1.25rem] leading-tight">{item.promo_title}</p>
              <p className="mt-1 text-sm text-mute">{item.perfumes.map((p) => p.name).join(' · ')}</p>
            </div>
            <p className="shrink-0 font-semibold tabular-nums">{money(item.unit_price)}</p>
          </li>
        ))}
      </ul>
      <dl className="mt-4 space-y-2">
        <div className="flex justify-between">
          <dt className="text-mute">Envío a domicilio</dt>
          <dd className="tabular-nums">{money(order.shippingCost)}</dd>
        </div>
        <div className="flex items-baseline justify-between pt-2">
          <dt className="font-semibold">Total</dt>
          <dd className="price text-[2.25rem] text-gold-bright">{money(order.total)}</dd>
        </div>
      </dl>
      <p className="mt-5 border-t border-ink-3 pt-5 text-mute">
        <span className="font-semibold text-paper">Entrega:</span> {order.customer.address}, {order.customer.city}
      </p>
    </div>
  )
}

export default function Order() {
  usePageTitle('Tu pedido')
  const { id, token } = useParams()
  const [params] = useSearchParams()
  const paymentId = params.get('payment_id') ?? params.get('collection_id')
  const mpStatus = params.get('status') ?? params.get('collection_status')

  const { clear } = useCart()
  const { shipping } = useCatalog()
  const [state, setState] = useState({ status: 'loading', order: null })
  const polls = useRef(0)

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  // Consulta el pedido y, mientras el pago se esté confirmando, vuelve a preguntar cada pocos segundos.
  useEffect(() => {
    let cancelled = false
    let timer

    async function load() {
      try {
        const order = await fetchOrder({ id, token, paymentId })
        if (cancelled) return
        if (!order) return setState({ status: 'missing', order: null })
        setState({ status: 'ready', order })
        if (viewOf(order, mpStatus) === 'confirmando' && polls.current < POLL_MAX) {
          polls.current += 1
          timer = setTimeout(load, POLL_MS)
        }
      } catch (error) {
        if (!cancelled) setState({ status: error.code === 'pedido_no_encontrado' ? 'missing' : 'error', order: null })
      }
    }
    load()

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [id, token, paymentId, mpStatus])

  const { order } = state
  const view = order ? viewOf(order, mpStatus) : state.status

  // Con el pago acreditado, el carrito ya cumplió su función.
  useEffect(() => {
    if (view === 'pagado') clear()
  }, [view, clear])

  const firstName = order?.customer.name.split(' ')[0]
  const home = (
    <Link to="/" className="btn btn-ghost">
      Volver al inicio
    </Link>
  )
  const retry = order?.retryUrl && (
    <a href={order.retryUrl} className="btn btn-gold">
      {view === 'rechazado' ? 'Reintentar el pago' : 'Ir a pagar'}
    </a>
  )

  return (
    <section className="grain relative isolate min-h-svh overflow-hidden bg-ink pt-[4.5rem]">
      {view === 'pagado' && (
        <div
          aria-hidden="true"
          className="absolute left-1/2 top-0 -z-10 aspect-square w-[min(140%,60rem)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(closest-side,oklch(0.79_0.125_84/0.28),transparent)]"
        />
      )}

      <div className="mx-auto max-w-2xl px-5 py-16 text-center md:py-24" aria-live="polite">
        {view === 'loading' && (
          <div className="flex flex-col items-center gap-6 py-20 text-mute">
            <LoaderCircle size={32} strokeWidth={1.4} className="animate-spin" />
            <p role="status">Buscando tu pedido</p>
          </div>
        )}

        {(view === 'missing' || view === 'error') && (
          <>
            <h1 className="text-[clamp(2.5rem,7vw,4rem)]">
              {view === 'missing' ? 'No encontramos ese pedido' : 'No pudimos consultar tu pedido'}
            </h1>
            <p className="mx-auto mt-5 max-w-md text-lg text-mute">
              {view === 'missing'
                ? 'Revisá que el link esté completo. Si ya pagaste, escribinos por Instagram y lo buscamos.'
                : 'Revisá tu conexión y recargá la página. Si ya pagaste, tu pedido está registrado.'}
            </p>
            <div className="mt-10 flex justify-center">{home}</div>
          </>
        )}

        {view === 'pagado' && (
          <>
            <div className="flex justify-center">
              <Badge tone="gold">
                <Check size={36} strokeWidth={1.4} />
              </Badge>
            </div>
            <p className="eyebrow mt-8 text-gold">Pedido {order.number}</p>
            <h1 className="mt-5 text-[clamp(2.75rem,8vw,5rem)]">
              ¡Gracias, <em className="text-gold-bright">{firstName}!</em>
            </h1>
            <p className="mx-auto mt-6 max-w-md text-lg text-mute">
              Tu pago se acreditó y tu pedido está confirmado. Te lo llevamos en {shipping.eta}.
              {order.emailEnabled && ` Te enviamos el detalle a ${order.customer.email}.`}
            </p>
            {order.demo && (
              <p className="mx-auto mt-6 max-w-md rounded-[3px] border border-ink-3 p-3 text-sm text-mute">
                Pedido de prueba: no se realizó ningún cobro.
              </p>
            )}
            <Summary order={order} />
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              {home}
              <a
                href={site.instagram.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-11 items-center text-sm font-semibold uppercase tracking-[0.14em] text-paper underline decoration-ink-3 underline-offset-8 hover:decoration-gold"
              >
                Consultas por Instagram
              </a>
            </div>
          </>
        )}

        {view === 'confirmando' && (
          <>
            <div className="flex justify-center">
              <Badge tone="mute">
                <LoaderCircle size={34} strokeWidth={1.4} className="animate-spin" />
              </Badge>
            </div>
            <p className="eyebrow mt-8 text-gold">Pedido {order.number}</p>
            <h1 className="mt-5 text-[clamp(2.5rem,7vw,4rem)]">Estamos confirmando tu pago</h1>
            <p className="mx-auto mt-5 max-w-md text-lg text-mute" role="status">
              Suele tardar unos segundos. Esta página se actualiza sola; no hace falta que vuelvas a pagar.
            </p>
            <Summary order={order} />
            <div className="mt-10 flex justify-center">{home}</div>
          </>
        )}

        {view === 'sin_pagar' && (
          <>
            <div className="flex justify-center">
              <Badge tone="mute">
                <Clock size={34} strokeWidth={1.4} />
              </Badge>
            </div>
            <p className="eyebrow mt-8 text-gold">Pedido {order.number}</p>
            <h1 className="mt-5 text-[clamp(2.5rem,7vw,4rem)]">Falta completar el pago</h1>
            <p className="mx-auto mt-5 max-w-md text-lg text-mute">
              Tu combo está guardado. Para confirmarlo, terminá el pago en Mercado Pago.
            </p>
            <Summary order={order} />
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              {retry}
              {home}
            </div>
          </>
        )}

        {view === 'rechazado' && (
          <>
            <div className="flex justify-center">
              <Badge tone="danger">
                <X size={36} strokeWidth={1.4} />
              </Badge>
            </div>
            <p className="eyebrow mt-8 text-gold">Pedido {order.number}</p>
            <h1 className="mt-5 text-[clamp(2.5rem,7vw,4rem)]">El pago no se pudo completar</h1>
            <p className="mx-auto mt-5 max-w-md text-lg text-mute">
              No se te cobró nada. Podés reintentar con la misma tarjeta o con otra; tu combo sigue guardado.
            </p>
            <Summary order={order} />
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              {retry}
              {home}
            </div>
          </>
        )}

        {view === 'cancelado' && (
          <>
            <p className="eyebrow text-gold">Pedido {order.number}</p>
            <h1 className="mt-5 text-[clamp(2.5rem,7vw,4rem)]">Este pedido fue cancelado</h1>
            <p className="mx-auto mt-5 max-w-md text-lg text-mute">
              Si querés, podés armar tu combo de nuevo. Ante cualquier duda escribinos por Instagram.
            </p>
            <div className="mt-10 flex justify-center">{home}</div>
          </>
        )}
      </div>
    </section>
  )
}
