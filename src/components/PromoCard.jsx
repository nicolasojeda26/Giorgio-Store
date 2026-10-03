import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { PromoArt } from './Bottles.jsx'
import { money } from '../lib/format.js'

/**
 * Tarjeta de promo. Toda la tarjeta es un enlace a /promo/:slug.
 * layout: 'feature' (grande), 'tile' (mediana) o 'band' (ancha).
 * En celular la ilustración va arriba; desde 640px va a la derecha del texto.
 */
export default function PromoCard({ promo, index, layout = 'tile' }) {
  const feature = layout === 'feature'

  const artColumn = {
    feature: 'sm:w-[46%] lg:w-[52%]',
    tile: 'sm:w-[42%]',
    band: 'sm:w-[40%] lg:w-[46%]',
  }[layout]

  const artSize = {
    feature: 'h-48 w-auto sm:h-auto sm:w-full sm:max-h-[26rem]',
    tile: 'h-40 w-auto sm:h-auto sm:w-full sm:max-h-[15rem]',
    band: 'h-40 w-auto sm:h-auto sm:w-full sm:max-h-[14rem]',
  }[layout]

  return (
    <Link
      to={`/promo/${promo.slug}`}
      className={`group relative isolate flex h-full flex-col overflow-hidden rounded-md border border-ink-3 bg-ink-2 transition-colors duration-300 hover:border-gold/70 sm:flex-row ${
        feature ? 'lg:min-h-[40rem]' : ''
      }`}
    >
      {/* Resplandor dorado detrás de los frascos */}
      <div
        aria-hidden="true"
        className="absolute right-[6%] top-0 -z-10 aspect-square w-[70%] rounded-full bg-gold/20 opacity-70 blur-3xl transition-opacity duration-500 group-hover:opacity-100 sm:bottom-0 sm:top-auto sm:w-[48%]"
      />

      <div className="order-2 flex min-w-0 flex-1 flex-col p-6 sm:order-1 md:p-8">
        <div className="flex items-center gap-3">
          <span className="eyebrow text-gold">Promo {String(index + 1).padStart(2, '0')}</span>
          <span className="h-px w-8 bg-ink-3" />
          <span className="eyebrow text-mute">{promo.detail}</span>
        </div>

        <h3
          className={`mt-5 ${feature ? 'text-[2.5rem] md:text-[clamp(2.75rem,4.2vw,3.75rem)]' : 'text-[2.25rem] md:text-[2.5rem]'}`}
        >
          {promo.name}
        </h3>
        <p className={`mt-3 text-mute ${feature ? 'max-w-sm text-lg' : 'max-w-[19rem] text-base'}`}>
          {promo.description}
        </p>

        <div className="mt-auto pt-8">
          <p
            className={`price text-gold-bright ${
              feature ? 'text-[3.75rem] md:text-[clamp(4rem,5.8vw,5.25rem)]' : 'text-[3.25rem] md:text-[4rem]'
            }`}
          >
            {money(promo.price)}
          </p>
          <span className="mt-6 inline-flex items-center gap-3 text-[0.8125rem] font-bold uppercase tracking-[0.14em] text-paper">
            Elegir perfumes
            <span className="grid size-9 place-items-center rounded-full border border-ink-3 transition-[transform,background-color,border-color,color] duration-300 ease-out-quint group-hover:translate-x-1 group-hover:border-gold group-hover:bg-gold group-hover:text-ink">
              <ArrowRight size={16} strokeWidth={2} />
            </span>
          </span>
        </div>
      </div>

      <div
        className={`order-1 flex shrink-0 items-end justify-center px-6 pt-8 sm:order-2 sm:self-end sm:pl-0 sm:pr-8 sm:pt-8 ${artColumn}`}
      >
        {promo.image ? (
          <img
            src={promo.image}
            alt=""
            loading="lazy"
            decoding="async"
            className={`rounded-t-[3px] object-contain object-bottom ${artSize}`}
          />
        ) : (
          <PromoArt
            kind={promo.art}
            className={`transition-transform duration-500 ease-out-quint group-hover:-translate-y-1.5 ${artSize}`}
          />
        )}
      </div>
    </Link>
  )
}
