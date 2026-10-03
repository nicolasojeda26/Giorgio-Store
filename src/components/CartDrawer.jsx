import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ShoppingBag, Trash2, X } from 'lucide-react'
import { PromoArt } from './Bottles.jsx'
import { useCart } from '../lib/cart.jsx'
import { useSectionNav } from '../lib/useSectionNav.js'
import { useCatalog } from '../lib/catalog.jsx'
import { money } from '../lib/format.js'

// ["a", "a", "b"] -> ["2 × A", "B"]
export function perfumeLines(ids, getPerfume) {
  const counts = new Map()
  ids.forEach((id) => counts.set(id, (counts.get(id) ?? 0) + 1))
  return [...counts].map(([id, n]) => `${n > 1 ? `${n} × ` : ''}${getPerfume(id)?.name ?? id}`)
}

/** Panel lateral del carrito: lista de combos, envío y total, y el paso al checkout. */
export default function CartDrawer() {
  const { open, closeCart, items, subtotal, removeItem } = useCart()
  const { getPromo, getPerfume, shipping } = useCatalog()
  const goTo = useSectionNav()
  const empty = items.length === 0

  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && closeCart()
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, closeCart])

  const toPromos = (e) => {
    closeCart()
    goTo('promos')(e)
  }

  return (
    <div className={`fixed inset-0 z-[60] ${open ? '' : 'pointer-events-none'}`} inert={!open}>
      <div
        onClick={closeCart}
        className={`absolute inset-0 bg-ink/70 transition-opacity duration-300 ${open ? 'opacity-100' : 'opacity-0'}`}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Carrito"
        className={`absolute inset-y-0 right-0 flex w-full max-w-md flex-col bg-paper text-ink transition-transform duration-300 ease-out-quint ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex h-[4.5rem] shrink-0 items-center justify-between border-b border-line px-6">
          <h2 className="font-display text-2xl">
            Tu carrito{!empty && <span className="ml-2 font-sans text-base text-mute-ink">({items.length})</span>}
          </h2>
          <button
            type="button"
            onClick={closeCart}
            aria-label="Cerrar carrito"
            className="-mr-3 grid size-11 place-items-center"
          >
            <X size={22} strokeWidth={1.6} />
          </button>
        </div>

        {empty ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-5 px-8 text-center">
            <span className="grid size-16 place-items-center rounded-full border border-line">
              <ShoppingBag size={26} strokeWidth={1.4} />
            </span>
            <div>
              <p className="font-display text-3xl leading-tight">Todavía está vacío</p>
              <p className="mt-2 text-mute-ink">Elegí una promo y armá tu combo para empezar.</p>
            </div>
            <a href="#promos" onClick={toPromos} className="btn mt-2 bg-ink text-paper">
              Ver promos
            </a>
          </div>
        ) : (
          <>
            <ul className="flex-1 overflow-y-auto px-6">
              {items.map((item) => {
                const promo = getPromo(item.promoSlug)
                if (!promo) return null
                return (
                  <li key={item.id} className="flex gap-4 border-b border-line py-5">
                    <div className="grid size-[4.5rem] shrink-0 place-items-end justify-center rounded-[3px] bg-ink px-2 pt-2">
                      <PromoArt kind={promo.art} className="h-full w-full" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-display text-[1.375rem] leading-tight tracking-[-0.01em]">{promo.title}</h3>
                      <ul className="mt-1.5 text-[0.9375rem] leading-snug text-mute-ink">
                        {perfumeLines(item.perfumeIds, getPerfume).map((line) => (
                          <li key={line}>{line}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="flex shrink-0 flex-col items-end justify-between">
                      <p className="text-lg font-bold tabular-nums">{money(promo.price)}</p>
                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        aria-label={`Quitar ${promo.title} del carrito`}
                        className="-mb-2 -mr-3 grid size-11 place-items-center text-mute-ink transition-colors duration-150 hover:text-ink"
                      >
                        <Trash2 size={18} strokeWidth={1.6} />
                      </button>
                    </div>
                  </li>
                )
              })}
            </ul>

            <div className="shrink-0 border-t border-ink px-6 pb-6 pt-5">
              <dl className="space-y-2 text-base">
                <div className="flex justify-between">
                  <dt className="text-mute-ink">Subtotal</dt>
                  <dd className="tabular-nums">{money(subtotal)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-mute-ink">Envío a {shipping.zone}</dt>
                  <dd className="tabular-nums">{money(shipping.cost)}</dd>
                </div>
                <div className="flex items-baseline justify-between pt-2">
                  <dt className="font-semibold">Total</dt>
                  <dd className="price text-[2.25rem]">{money(subtotal + shipping.cost)}</dd>
                </div>
              </dl>

              <Link to="/checkout" onClick={closeCart} className="btn mt-5 w-full bg-ink text-paper">
                Finalizar compra
              </Link>
              <a
                href="#promos"
                onClick={toPromos}
                className="mt-2 flex min-h-11 items-center justify-center text-sm font-semibold underline decoration-line underline-offset-4"
              >
                Armar otro combo
              </a>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
