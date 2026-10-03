import { ArrowDown } from 'lucide-react'
import { PromoArt } from '../components/Bottles.jsx'
import { useCatalog } from '../lib/catalog.jsx'
import { money } from '../lib/format.js'
import { useSectionNav } from '../lib/useSectionNav.js'

export default function Hero() {
  const goTo = useSectionNav()
  const { promos, shipping } = useCatalog()
  const from = promos.length > 0 ? Math.min(...promos.map((p) => p.price)) : null

  return (
    <section className="grain relative isolate overflow-hidden bg-ink pt-[4.5rem]">
      {/* Luz dorada de escenario */}
      <div
        aria-hidden="true"
        className="absolute -right-[20%] top-[8%] -z-10 aspect-square w-[120%] rounded-full bg-[radial-gradient(closest-side,oklch(0.79_0.125_84/0.34),transparent)] lg:-right-[8%] lg:top-[-6%] lg:w-[62%]"
      />

      <div className="mx-auto grid max-w-[90rem] grid-cols-1 items-end gap-6 px-5 md:px-10 lg:min-h-[calc(100svh-4.5rem)] lg:grid-cols-12 lg:gap-10">
        <div className="min-w-0 pb-4 pt-12 md:pt-20 lg:col-span-6 lg:self-center lg:pb-24 lg:pt-10">
          <p className="hero-in eyebrow text-gold" style={{ '--i': 0 }}>
            Promos de perfumes · {shipping.zone}
          </p>
          <h1 className="hero-in mt-6 text-[clamp(3.25rem,7.6vw,6.75rem)] leading-[0.94]" style={{ '--i': 1 }}>
            Tu perfume,
            <br />
            <em className="text-gold-bright">tu estilo.</em>
          </h1>
          <p className="hero-in mt-7 max-w-[30rem] text-lg text-mute md:text-xl" style={{ '--i': 2 }}>
            Elegí una promo, armá tu combo y pagalo online. Te lo llevamos a tu casa.
          </p>

          <div className="hero-in mt-9 flex flex-col gap-4 sm:flex-row sm:items-center" style={{ '--i': 3 }}>
            <a href="#promos" onClick={goTo('promos')} className="btn btn-gold">
              Ver promos
              <ArrowDown size={18} strokeWidth={2.2} />
            </a>
            <a
              href="#como-comprar"
              onClick={goTo('como-comprar')}
              className="inline-flex min-h-11 items-center justify-center text-sm font-semibold uppercase tracking-[0.14em] text-paper underline decoration-ink-3 decoration-1 underline-offset-8 transition-colors duration-200 hover:decoration-gold sm:px-4"
            >
              Cómo comprar
            </a>
          </div>

          <dl className="hero-in mt-12 flex gap-8 border-t border-ink-3 pt-6 text-sm md:gap-12" style={{ '--i': 4 }}>
            {from !== null && (
              <div>
                <dt className="text-mute">Promos desde</dt>
                <dd className="mt-1 text-xl font-semibold text-paper">{money(from)}</dd>
              </div>
            )}
            <div>
              <dt className="text-mute">Envío a domicilio</dt>
              <dd className="mt-1 text-xl font-semibold text-paper">{shipping.eta}</dd>
            </div>
          </dl>
        </div>

        {/* Composición de frascos */}
        <div className="hero-art relative min-w-0 px-2 pb-2 pt-10 sm:px-16 lg:col-span-6 lg:self-end lg:px-0 lg:pb-10 lg:pt-0">
          <div
            aria-hidden="true"
            className="absolute bottom-0 left-1/2 h-10 w-[80%] -translate-x-1/2 rounded-[100%] bg-black/70 blur-xl"
          />
          <PromoArt
            kind="hero"
            className="relative h-auto w-full origin-bottom drop-shadow-[0_24px_30px_rgba(0,0,0,0.5)] lg:scale-110"
          />
        </div>
      </div>
    </section>
  )
}
