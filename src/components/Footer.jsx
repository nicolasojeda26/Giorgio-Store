import { ArrowUpRight, Clock, MapPin } from 'lucide-react'
import Logo from './Logo.jsx'
import { NAV } from './Header.jsx'
import { site } from '../config/site.js'
import { useSectionNav } from '../lib/useSectionNav.js'

export default function Footer() {
  const goTo = useSectionNav()

  return (
    <footer className="border-t border-ink-3 bg-ink text-paper">
      <div className="mx-auto max-w-[90rem] px-5 pb-10 pt-16 md:px-10 md:pt-24">
        <div className="grid gap-12 md:grid-cols-12">
          <div className="md:col-span-5">
            <p className="eyebrow text-gold">Nuestro local</p>
            <ul className="mt-5 space-y-4 text-[1.0625rem]">
              <li className="flex gap-3">
                <MapPin size={20} strokeWidth={1.5} className="mt-1 shrink-0 text-gold" />
                {site.address}
              </li>
              <li className="flex gap-3">
                <Clock size={20} strokeWidth={1.5} className="mt-1 shrink-0 text-gold" />
                {site.hours}
              </li>
            </ul>
            <p className="mt-5 max-w-sm text-mute">
              Si querés probar una fragancia antes de comprar, en el local tenemos todos los probadores.
            </p>
          </div>

          <nav aria-label="Pie de página" className="md:col-span-3 md:col-start-7">
            <p className="eyebrow text-gold">Navegación</p>
            <ul className="mt-3">
              {NAV.map((item) => (
                <li key={item.id}>
                  <a
                    href={`#${item.id}`}
                    onClick={goTo(item.id)}
                    className="inline-flex min-h-11 items-center transition-colors duration-200 hover:text-gold-bright"
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div className="md:col-span-3">
            <p className="eyebrow text-gold">Seguinos</p>
            <a
              href={site.instagram.url}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex min-h-11 items-center gap-2 transition-colors duration-200 hover:text-gold-bright"
            >
              Instagram {site.instagram.handle}
              <ArrowUpRight size={18} strokeWidth={1.6} />
            </a>
            <p className="mt-1 max-w-xs text-mute">Novedades, lanzamientos y los recorridos del Giorgio Móvil.</p>
          </div>
        </div>

        <div
          aria-hidden="true"
          className="mt-16 flex justify-center border-t border-ink-3 pt-12 text-paper/90 md:mt-24"
        >
          <Logo size="xl" />
        </div>

        <div className="mt-12 flex flex-col gap-2 text-sm text-mute md:flex-row md:items-center md:justify-between">
          <p>© {new Date().getFullYear()} Giorgio Perfumería. Corrientes, Argentina.</p>
          <p>
            Desarrollado por{' '}
            <a
              href="https://litoral-dev.vercel.app"
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-11 items-center text-paper underline-offset-4 hover:underline"
            >
              litoral.dev
            </a>
          </p>
        </div>
      </div>
    </footer>
  )
}
