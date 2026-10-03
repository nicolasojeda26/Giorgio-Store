import { Plus } from 'lucide-react'
import Reveal from '../components/Reveal.jsx'
import { site } from '../config/site.js'
import { useCatalog } from '../lib/catalog.jsx'

const faqs = (shipping) => [
  {
    q: '¿Cómo funciona una promo?',
    a: 'Cada promo tiene un precio cerrado y una cantidad de perfumes. Entrás, elegís esa cantidad entre las fragancias disponibles y lo agregás al carrito.',
  },
  {
    q: '¿Puedo combinar perfumes distintos?',
    a: 'Sí. Dentro de una misma promo podés mezclar como quieras: de hombre, de mujer o unisex.',
  },
  {
    q: '¿Cómo pago?',
    a: 'Con tarjeta de débito o de crédito, desde la misma web y a través de Mercado Pago. No hace falta transferir ni mandar comprobantes.',
  },
  {
    q: '¿A dónde hacen envíos?',
    a: `Por ahora enviamos a domicilio dentro de ${shipping.zone}, con un costo fijo que ves antes de pagar.`,
  },
  {
    q: '¿Tengo que escribirles para confirmar el pedido?',
    a: 'No. Cuando el pago se acredita, tu pedido queda confirmado y recibís un email con el detalle y el número de pedido.',
  },
  {
    q: '¿Puedo probar las fragancias antes?',
    a: `Sí, en nuestro local de ${site.address} tenemos todos los probadores. Abrimos ${site.hours.toLowerCase()}.`,
  },
]

export default function Faq() {
  const { shipping } = useCatalog()
  return (
    <section id="preguntas" className="border-t border-line bg-paper py-24 text-ink md:py-36">
      <div className="mx-auto grid max-w-[90rem] gap-12 px-5 md:px-10 lg:grid-cols-12">
        <Reveal className="lg:col-span-4">
          <div className="lg:sticky lg:top-28">
            <p className="eyebrow text-gold-deep">Preguntas frecuentes</p>
            <h2 className="mt-5 text-[clamp(2.5rem,6vw,4.5rem)]">
              Antes de <em>comprar.</em>
            </h2>
            <p className="mt-6 max-w-xs text-lg text-mute-ink">
              ¿Te quedó otra duda? Escribinos por Instagram a{' '}
              <a
                href={site.instagram.url}
                target="_blank"
                rel="noreferrer"
                className="font-semibold text-ink underline decoration-gold-deep underline-offset-4"
              >
                {site.instagram.handle}
              </a>
              .
            </p>
          </div>
        </Reveal>

        <Reveal delay={60} className="lg:col-span-7 lg:col-start-6">
          <ul className="border-t border-ink">
            {faqs(shipping).map((item) => (
              <li key={item.q} className="border-b border-line">
                <details className="group">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-6 [&::-webkit-details-marker]:hidden">
                    <span className="font-display text-[1.5rem] leading-tight md:text-[1.75rem]">{item.q}</span>
                    <span className="grid size-10 shrink-0 place-items-center rounded-full border border-line transition-transform duration-200 ease-out-quint group-open:rotate-45">
                      <Plus size={18} strokeWidth={1.6} />
                    </span>
                  </summary>
                  <p className="max-w-[38rem] pb-7 text-lg text-mute-ink">{item.a}</p>
                </details>
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </section>
  )
}
