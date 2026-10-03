import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, CircleAlert, CreditCard, LoaderCircle, Lock, Truck } from 'lucide-react'
import { perfumeLines } from '../components/CartDrawer.jsx'
import { BACKEND_ENABLED } from '../lib/backend.js'
import { useCart } from '../lib/cart.jsx'
import { useCatalog } from '../lib/catalog.jsx'
import { money } from '../lib/format.js'
import { createOrder } from '../lib/orders.js'
import { usePageTitle } from '../lib/usePageTitle.js'
import { useSectionNav } from '../lib/useSectionNav.js'
import { LIMITS, cleanCustomer, validateCustomer } from '../../shared/validation.js'

const DRAFT_KEY = 'giorgio:datos:v1'
const EMPTY = { name: '', phone: '', email: '', address: '', notes: '' }
const FIELD_ORDER = ['name', 'phone', 'email', 'address']
// Errores del servidor que significan "tu carrito quedó viejo": conviene recargar el catálogo.
const STALE_CART = ['promo_no_disponible', 'perfume_no_disponible', 'sin_stock', 'combo_incompleto']

function loadDraft() {
  try {
    return { ...EMPTY, ...JSON.parse(localStorage.getItem(DRAFT_KEY)) }
  } catch {
    return EMPTY
  }
}

function Field({ id, label, error, hint, optional, ...input }) {
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined
  return (
    <div>
      <label htmlFor={id} className="flex items-baseline justify-between text-[0.9375rem] font-semibold">
        {label}
        {optional && <span className="text-sm font-normal text-mute-ink">Opcional</span>}
      </label>
      <input
        id={id}
        name={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={`mt-2 h-13 w-full rounded-[3px] border bg-white/70 px-4 text-base text-ink transition-colors duration-150 focus:border-ink focus:outline-2 focus:outline-offset-0 focus:outline-gold ${
          error ? 'border-danger' : 'border-ink/30'
        }`}
        {...input}
      />
      {error ? (
        <p id={`${id}-error`} className="mt-2 flex gap-2 text-sm text-danger">
          <CircleAlert size={16} strokeWidth={2} className="mt-0.5 shrink-0" />
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${id}-hint`} className="mt-2 text-sm text-mute-ink">
            {hint}
          </p>
        )
      )}
    </div>
  )
}

function Step({ number, title, children }) {
  return (
    <fieldset className="border-t border-ink pt-6">
      <legend className="float-left mb-6 flex w-full items-baseline gap-4">
        <span aria-hidden="true" className="price text-[2.5rem] text-gold-deep">
          {number}
        </span>
        <span className="font-display text-[1.75rem] tracking-[-0.01em] md:text-[2rem]">{title}</span>
      </legend>
      <div className="clear-both">{children}</div>
    </fieldset>
  )
}

export default function Checkout() {
  usePageTitle('Finalizar compra')
  const navigate = useNavigate()
  const goTo = useSectionNav()
  const { items, subtotal, clear } = useCart()
  const { getPromo, getPerfume, shipping, reload } = useCatalog()

  const [values, setValues] = useState(loadDraft)
  const [touched, setTouched] = useState({})
  const [submitted, setSubmitted] = useState(false)
  const [pending, setPending] = useState(false)
  const [serverError, setServerError] = useState(null)
  const [serverFields, setServerFields] = useState({})
  const websiteRef = useRef(null)

  // Al entrar, y si el carrito queda vacío (el contenido se acorta), se vuelve arriba.
  const isEmpty = items.length === 0
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [isEmpty])

  const total = subtotal + shipping.cost
  const errors = { ...serverFields, ...validateCustomer(values) }
  const errorOf = (field) => (touched[field] || submitted ? errors[field] : undefined)

  const bind = (field) => ({
    value: values[field],
    maxLength: LIMITS[field],
    error: errorOf(field),
    onChange: (e) => {
      setValues((prev) => ({ ...prev, [field]: e.target.value }))
      setServerFields((prev) => ({ ...prev, [field]: undefined }))
    },
    onBlur: () => setTouched((prev) => ({ ...prev, [field]: true })),
  })

  async function onSubmit(event) {
    event.preventDefault()
    setSubmitted(true)
    setServerError(null)

    const firstInvalid = FIELD_ORDER.find((field) => validateCustomer(values)[field])
    if (firstInvalid) {
      document.getElementById(firstInvalid)?.focus()
      return
    }

    const customer = cleanCustomer(values)
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(customer)) // para no volver a escribirlos la próxima vez
    } catch {
      /* sin almacenamiento disponible */
    }

    setPending(true)
    try {
      const result = await createOrder({
        customer,
        items,
        website: websiteRef.current?.value,
        preview: {
          demo: true,
          number: 'GP-000000',
          status: 'pagado',
          items: items.map((item) => {
            const promo = getPromo(item.promoSlug)
            return {
              promo_title: promo.title,
              unit_price: promo.price,
              promo_slug: promo.slug,
              perfumes: item.perfumeIds.map((id) => {
                const perfume = getPerfume(id)
                return { slug: perfume.id, name: perfume.name, size: perfume.size }
              }),
            }
          }),
          subtotal,
          shippingCost: shipping.cost,
          total,
          customer: { name: customer.name, email: customer.email, address: customer.address, city: shipping.zone },
        },
      })
      if (result.demo) {
        clear()
        navigate('/pedido/prueba')
      } else {
        window.location.assign(result.initPoint) // sigue en Mercado Pago
      }
    } catch (error) {
      setServerError(error.message)
      setServerFields(error.fields ?? {})
      if (STALE_CART.includes(error.code)) reload()
      setPending(false)
    }
  }

  if (isEmpty && !pending) {
    // Si el servidor rechazó el carrito (por ejemplo, un perfume sin stock), el combo ya se quitó:
    // se explica por qué en lugar de mostrar solo "carrito vacío".
    return (
      <section className="grid min-h-svh place-items-center bg-paper px-5 pt-[4.5rem] text-center text-ink">
        <div role={serverError ? 'alert' : undefined}>
          <p className="eyebrow text-gold-deep">Finalizar compra</p>
          <h1 className="mt-5 text-[clamp(2.5rem,7vw,4rem)]">
            {serverError ? 'Hay que rearmar tu combo' : 'Tu carrito está vacío'}
          </h1>
          <p className="mx-auto mt-4 max-w-md text-lg text-mute-ink">
            {serverError ?? 'Elegí una promo y armá tu combo para poder pagar.'}
          </p>
          <a href="#promos" onClick={goTo('promos')} className="btn mt-8 bg-ink text-paper">
            Ver promos
          </a>
        </div>
      </section>
    )
  }

  return (
    <section className="min-h-svh bg-paper pb-20 pt-[4.5rem] text-ink md:pb-28">
      <div className="mx-auto max-w-[78rem] px-5 md:px-10">
        <header className="pb-8 pt-6 md:pb-12 md:pt-10">
          <Link
            to="/"
            className="inline-flex min-h-11 items-center gap-2 text-[0.8125rem] font-semibold uppercase tracking-[0.14em] text-mute-ink transition-colors duration-200 hover:text-ink"
          >
            <ArrowLeft size={16} strokeWidth={2} />
            Seguir comprando
          </Link>
          <h1 className="mt-4 text-[clamp(2.75rem,7vw,5rem)]">
            Finalizar <em>compra</em>
          </h1>
        </header>

        <form onSubmit={onSubmit} noValidate className="grid gap-12 lg:grid-cols-12 lg:gap-14">
          <div className="space-y-12 lg:col-span-7">
            <Step number="1" title="Tus datos">
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Field id="name" label="Nombre y apellido" autoComplete="name" {...bind('name')} />
                </div>
                <Field
                  id="phone"
                  label="Teléfono"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  hint="Para coordinar la entrega."
                  {...bind('phone')}
                />
                <Field
                  id="email"
                  label="Email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  autoCapitalize="none"
                  spellCheck={false}
                  hint="Ahí te llega la confirmación."
                  {...bind('email')}
                />
              </div>
            </Step>

            <Step number="2" title="Envío a domicilio">
              <div className="grid gap-5">
                <Field
                  id="address"
                  label="Dirección"
                  autoComplete="street-address"
                  hint={`Calle y altura. Enviamos solo dentro de ${shipping.zone}.`}
                  {...bind('address')}
                />
                <Field
                  id="notes"
                  label="Piso, departamento o referencias"
                  optional
                  autoComplete="off"
                  {...bind('notes')}
                />
              </div>
              <div className="mt-6 flex items-center gap-4 rounded-[3px] border border-line bg-paper-2 p-4">
                <Truck size={24} strokeWidth={1.4} className="shrink-0 text-gold-deep" />
                <p className="flex-1 leading-snug">
                  <span className="font-semibold">Envío a {shipping.zone}</span>
                  <span className="block text-sm text-mute-ink">Llega en {shipping.eta}</span>
                </p>
                <p className="font-bold tabular-nums">{money(shipping.cost)}</p>
              </div>
            </Step>

            <Step number="3" title="Pago">
              <div className="flex items-start gap-4 rounded-[3px] border border-line bg-paper-2 p-4">
                <CreditCard size={24} strokeWidth={1.4} className="mt-0.5 shrink-0 text-gold-deep" />
                <p className="leading-snug">
                  <span className="font-semibold">Tarjeta de débito o crédito</span>
                  <span className="mt-1 block text-sm text-mute-ink">
                    Al confirmar te llevamos a Mercado Pago para completar el pago de forma segura. Después volvés acá
                    con tu pedido confirmado.
                  </span>
                </p>
              </div>
            </Step>

            {/* Campo trampa para bots: las personas no lo ven ni lo completan. */}
            <input ref={websiteRef} type="text" name="website" tabIndex={-1} autoComplete="off" hidden />
          </div>

          <aside aria-label="Tu compra" className="lg:col-span-5">
            <div className="grain relative isolate overflow-hidden rounded-md bg-ink p-6 text-paper md:p-8 lg:sticky lg:top-24">
              <div
                aria-hidden="true"
                className="absolute -right-24 -top-24 -z-10 size-72 rounded-full bg-gold/20 blur-3xl"
              />
              <h2 className="font-display text-[1.75rem]">Tu compra</h2>

              <ul className="mt-5 border-t border-ink-3">
                {items.map((item) => {
                  const promo = getPromo(item.promoSlug)
                  return (
                    <li key={item.id} className="flex justify-between gap-4 border-b border-ink-3 py-4">
                      <div className="min-w-0">
                        <p className="font-display text-[1.25rem] leading-tight">{promo.title}</p>
                        <ul className="mt-1 text-sm leading-snug text-mute">
                          {perfumeLines(item.perfumeIds, getPerfume).map((line) => (
                            <li key={line}>{line}</li>
                          ))}
                        </ul>
                      </div>
                      <p className="shrink-0 font-semibold tabular-nums">{money(promo.price)}</p>
                    </li>
                  )
                })}
              </ul>

              <dl className="mt-5 space-y-2">
                <div className="flex justify-between">
                  <dt className="text-mute">Subtotal</dt>
                  <dd className="tabular-nums">{money(subtotal)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-mute">Envío</dt>
                  <dd className="tabular-nums">{money(shipping.cost)}</dd>
                </div>
                <div className="flex items-baseline justify-between pt-3">
                  <dt className="font-semibold">Total</dt>
                  <dd className="price text-[2.75rem] text-gold-bright">{money(total)}</dd>
                </div>
              </dl>

              <div role="alert" aria-live="assertive">
                {serverError && (
                  <p className="mt-5 flex gap-2 rounded-[3px] border border-danger-bright/60 p-3 text-sm text-danger-bright">
                    <CircleAlert size={16} strokeWidth={2} className="mt-0.5 shrink-0" />
                    {serverError}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={pending}
                className="btn btn-gold mt-6 w-full disabled:pointer-events-none disabled:opacity-80"
              >
                {pending ? (
                  <>
                    <LoaderCircle size={18} strokeWidth={2.2} className="animate-spin" />
                    Un momento
                  </>
                ) : (
                  `Pagar ${money(total)}`
                )}
              </button>

              <p className="mt-4 flex items-center justify-center gap-2 text-sm text-mute">
                <Lock size={14} strokeWidth={2} />
                Pago seguro con Mercado Pago
              </p>
              {!BACKEND_ENABLED && (
                <p className="mt-4 border-t border-ink-3 pt-4 text-center text-sm text-mute">
                  Modo de prueba: al confirmar no se cobra nada.
                </p>
              )}
            </div>
          </aside>
        </form>
      </div>
    </section>
  )
}
