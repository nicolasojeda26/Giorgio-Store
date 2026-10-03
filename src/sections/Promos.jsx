import PromoCard from '../components/PromoCard.jsx'
import Reveal from '../components/Reveal.jsx'
import { useCatalog } from '../lib/catalog.jsx'

export default function Promos() {
  const { promos: active } = useCatalog()
  const [feature, ...rest] = active
  const tiles = rest.slice(0, 2)
  const bands = rest.slice(2)

  return (
    <section id="promos" className="bg-ink py-24 md:py-36">
      <div className="mx-auto max-w-[90rem] px-5 md:px-10">
        <Reveal className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="eyebrow text-gold">Promos vigentes</p>
            <h2 className="mt-5 text-[clamp(2.375rem,7vw,5.5rem)]">
              Primero la promo,
              <br />
              después <em className="text-gold-bright">los perfumes.</em>
            </h2>
          </div>
          <p className="max-w-sm text-lg text-mute">
            Entrá a la que más te guste y elegí las fragancias que van en tu combo. El precio ya está cerrado.
          </p>
        </Reveal>

        <div className="mt-12 grid gap-4 md:mt-16 lg:grid-cols-12 lg:grid-rows-2 lg:gap-5">
          {feature && (
            <Reveal className="lg:col-span-7 lg:row-span-2">
              <PromoCard promo={feature} index={0} layout="feature" />
            </Reveal>
          )}
          {tiles.map((promo, i) => (
            <Reveal key={promo.slug} delay={(i + 1) * 60} className="lg:col-span-5">
              <PromoCard promo={promo} index={i + 1} />
            </Reveal>
          ))}
          {bands.map((promo, i) => (
            <Reveal key={promo.slug} className="lg:col-span-12">
              <PromoCard promo={promo} index={i + 3} layout="band" />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
