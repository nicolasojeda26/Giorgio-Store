import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Menu, ShoppingBag, X } from 'lucide-react'
import Logo from './Logo.jsx'
import { useCart } from '../lib/cart.jsx'
import { useSectionNav } from '../lib/useSectionNav.js'

export const NAV = [
  { id: 'promos', label: 'Promos' },
  { id: 'como-comprar', label: 'Cómo comprar' },
  { id: 'envios', label: 'Envíos y pagos' },
  { id: 'preguntas', label: 'Preguntas' },
]

export default function Header() {
  const { pathname } = useLocation()
  const { count, openCart } = useCart()
  const goTo = useSectionNav()
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Menú móvil: bloquea el scroll de fondo y se cierra con Escape.
  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    if (!menuOpen) return
    const onKey = (e) => e.key === 'Escape' && setMenuOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [menuOpen])

  const solid = scrolled || pathname !== '/' || menuOpen

  return (
    <>
      <header
        className={`fixed inset-x-0 top-0 z-50 border-b transition-colors duration-300 ${
          solid ? 'border-ink-3 bg-ink/90 backdrop-blur-md' : 'border-transparent bg-transparent'
        }`}
      >
        <div className="mx-auto flex h-[4.5rem] max-w-[90rem] items-center justify-between px-5 md:px-10">
          <Link
            to="/"
            aria-label="Giorgio Perfumería, inicio"
            className="flex min-h-11 items-center text-paper"
            onClick={() => setMenuOpen(false)}
          >
            <Logo />
          </Link>

          <nav aria-label="Principal" className="hidden lg:block">
            <ul className="flex items-center gap-9">
              {NAV.map((item) => (
                <li key={item.id}>
                  <a
                    href={`#${item.id}`}
                    onClick={goTo(item.id)}
                    className="text-[0.8125rem] font-semibold uppercase tracking-[0.16em] text-paper/80 transition-colors duration-200 hover:text-gold-bright"
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={openCart}
              aria-label={`Abrir carrito, ${count} ${count === 1 ? 'producto' : 'productos'}`}
              className="relative grid size-11 place-items-center text-paper transition-colors duration-200 hover:text-gold-bright"
            >
              <ShoppingBag size={22} strokeWidth={1.6} />
              <span className="absolute right-0.5 top-1 grid h-[1.125rem] min-w-[1.125rem] place-items-center rounded-full bg-gold px-1 text-[0.6875rem] font-bold leading-none text-ink">
                {count}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              aria-expanded={menuOpen}
              aria-controls="menu-movil"
              aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
              className="grid size-11 place-items-center text-paper lg:hidden"
            >
              {menuOpen ? <X size={24} strokeWidth={1.6} /> : <Menu size={24} strokeWidth={1.6} />}
            </button>
          </div>
        </div>
      </header>

      {/* Fuera del <header>: su backdrop-filter recortaría un hijo con position: fixed */}
      {menuOpen && (
        <nav
          id="menu-movil"
          aria-label="Menú"
          className="fixed inset-x-0 bottom-0 top-[4.5rem] z-40 overflow-y-auto bg-ink px-5 pb-10 pt-6 lg:hidden"
        >
          <ul>
            {NAV.map((item) => (
              <li key={item.id} className="border-b border-ink-3">
                <a
                  href={`#${item.id}`}
                  onClick={(e) => {
                    setMenuOpen(false)
                    goTo(item.id)(e)
                  }}
                  className="block py-5 font-display text-[2rem] leading-none text-paper"
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </>
  )
}
