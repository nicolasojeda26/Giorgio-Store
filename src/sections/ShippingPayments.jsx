import { CreditCard, Lock, ShieldCheck, Truck } from 'lucide-react'
import Reveal from '../components/Reveal.jsx'
import { useCatalog } from '../lib/catalog.jsx'
import { money } from '../lib/format.js'

export default function ShippingPayments() {
  const { zone, cost, eta } = useCatalog().shipping

  return (
    <section id="envios" className="bg-paper pb-24 text-ink md:pb-36">
      <div className="mx-auto grid max-w-[90rem] gap-4 px-5 md:px-10 lg:grid-cols-12 lg:gap-5">
        {/* Envíos: panel oscuro, protagonista */}
        <Reveal className="grain relative isolate overflow-hidden rounded-md bg-ink p-7 text-paper md:p-12 lg:col-span-7">
          <div
            aria-hidden="true"
            className="absolute -right-24 -top-24 -z-10 size-80 rounded-full bg-gold/20 blur-3xl"
          />
          <Truck size={30} strokeWidth={1.3} className="text-gold" />
          <h2 className="mt-8 text-[clamp(2.25rem,5vw,4rem)]">
            Te lo llevamos <em className="text-gold-bright">a tu casa.</em>
          </h2>
          <p className="mt-5 max-w-md text-lg text-mute">
            Hacemos envíos a domicilio en toda {zone}. Cargás tu dirección al comprar y te avisamos cuando sale.
          </p>

          <dl className="mt-10 grid grid-cols-2 gap-6 border-t border-ink-3 pt-8 sm:grid-cols-3">
            <div>
              <dt className="eyebrow text-mute">Costo fijo</dt>
              <dd className="price mt-3 whitespace-nowrap text-[1.75rem] text-paper sm:text-[2.5rem]">{money(cost)}</dd>
            </div>
            <div>
              <dt className="eyebrow text-mute">Demora</dt>
              <dd className="price mt-3 whitespace-nowrap text-[1.75rem] text-paper sm:text-[2.5rem]">{eta}</dd>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <dt className="eyebrow text-mute">Zona</dt>
              <dd className="mt-3 font-display text-[1.5rem] leading-tight text-paper">{zone}</dd>
            </div>
          </dl>
        </Reveal>

        {/* Pagos */}
        <Reveal delay={60} className="flex flex-col rounded-md border border-line bg-paper-2 p-7 md:p-12 lg:col-span-5">
          <CreditCard size={30} strokeWidth={1.3} className="text-gold-deep" />
          <h2 className="mt-8 text-[clamp(2.25rem,5vw,3.25rem)]">Pagás online, en el momento.</h2>
          <p className="mt-5 text-lg text-mute-ink">
            Con tarjeta de débito o de crédito, a través de Mercado Pago. Tu pedido queda confirmado apenas se acredita.
          </p>

          <div aria-hidden="true" className="min-h-10 flex-1" />
          <ul className="space-y-4 border-t border-line pt-8 text-base">
            <li className="flex items-center gap-3">
              <ShieldCheck size={20} strokeWidth={1.5} className="shrink-0 text-gold-deep" />
              Compra protegida por Mercado Pago
            </li>
            <li className="flex items-center gap-3">
              <Lock size={20} strokeWidth={1.5} className="shrink-0 text-gold-deep" />
              No guardamos los datos de tu tarjeta
            </li>
          </ul>
        </Reveal>
      </div>
    </section>
  )
}
