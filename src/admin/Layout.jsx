import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { ClipboardList, LogOut, Settings, SprayCan, Store, Tag } from 'lucide-react'
import Logo from '../components/Logo.jsx'
import { useAdmin } from './store.jsx'

const NAV = [
  { to: '/admin/pedidos', label: 'Pedidos', icon: ClipboardList },
  { to: '/admin/promos', label: 'Promos', icon: Tag },
  { to: '/admin/perfumes', label: 'Perfumes', icon: SprayCan },
  { to: '/admin/ajustes', label: 'Ajustes', icon: Settings },
]

// En las pantallas de edición la barra inferior del celular deja lugar a Guardar / Cancelar.
const EDITING = /^\/admin\/(promos|perfumes)\/.+/

export default function Layout() {
  const { pathname } = useLocation()
  const { data, demo, session, signOut, toast } = useAdmin()
  const toShip = data?.orders.filter((o) => o.status === 'pagado').length ?? 0
  const editing = EDITING.test(pathname)

  const badge = (item) =>
    item.to === '/admin/pedidos' && toShip > 0 ? (
      <span className="grid h-5 min-w-5 place-items-center rounded-full bg-gold px-1.5 text-[0.6875rem] font-bold leading-none text-ink">
        {toShip}
      </span>
    ) : null

  return (
    <div className="min-h-svh bg-paper text-ink lg:grid lg:grid-cols-[15rem_1fr]">
      {/* Escritorio: menú lateral */}
      <aside className="sticky top-0 hidden h-svh flex-col bg-ink p-6 text-paper lg:flex">
        <Link to="/admin/pedidos" aria-label="Panel de Giorgio Perfumería" className="self-start">
          <Logo />
        </Link>
        <p className="eyebrow mt-3 text-gold">Panel</p>
        <nav aria-label="Panel" className="mt-10 flex flex-col gap-1">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex min-h-11 items-center gap-3 rounded-[3px] px-3 text-[0.9375rem] font-semibold transition-colors duration-150 ${
                  isActive ? 'bg-paper text-ink' : 'text-paper/80 hover:text-paper'
                }`
              }
            >
              <item.icon size={19} strokeWidth={1.6} />
              <span className="flex-1">{item.label}</span>
              {badge(item)}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto space-y-1 border-t border-ink-3 pt-4 text-sm">
          <p className="truncate px-3 pb-2 text-mute">{session.email}</p>
          <a
            href={import.meta.env.BASE_URL}
            target="_blank"
            rel="noreferrer"
            className="flex min-h-11 items-center gap-3 px-3 text-paper/80 hover:text-paper"
          >
            <Store size={18} strokeWidth={1.6} />
            Ver la tienda
          </a>
          <button
            type="button"
            onClick={signOut}
            className="flex min-h-11 w-full items-center gap-3 px-3 text-paper/80 hover:text-paper"
          >
            <LogOut size={18} strokeWidth={1.6} />
            Cerrar sesión
          </button>
        </div>
      </aside>

      <div className="min-w-0">
        {/* Celular: barra superior */}
        <header className="flex h-14 items-center justify-between bg-ink px-5 text-paper lg:hidden">
          <span className="flex items-baseline gap-3">
            <span className="font-display text-[1.375rem] uppercase leading-none">Giorgio</span>
            <span className="eyebrow text-[0.625rem] text-gold">Panel</span>
          </span>
          <a
            href={import.meta.env.BASE_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-11 items-center gap-2 text-sm text-paper/85"
          >
            <Store size={17} strokeWidth={1.6} />
            Ver la tienda
          </a>
        </header>

        <main>
          {demo && (
            <p className="border-b border-line bg-paper-2 px-5 py-2 text-center text-sm text-mute-ink lg:px-10 lg:text-left">
              Modo de prueba: los cambios se guardan solo en este navegador.
            </p>
          )}
          <div
            className={`mx-auto max-w-4xl px-5 pt-6 lg:mx-0 lg:px-10 lg:pb-16 lg:pt-10 ${editing ? 'pb-0' : 'pb-28'}`}
          >
            <Outlet />
          </div>
        </main>
      </div>

      {/* Celular: pestañas abajo, al alcance del pulgar */}
      {!editing && (
        <nav
          aria-label="Panel"
          className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-ink-3 bg-ink pb-[env(safe-area-inset-bottom)] text-paper lg:hidden"
        >
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `relative flex h-16 flex-col items-center justify-center gap-1 text-[0.6875rem] font-semibold ${
                  isActive ? 'text-gold-bright' : 'text-paper/75'
                }`
              }
            >
              <span className="relative">
                <item.icon size={22} strokeWidth={1.6} />
                <span className="absolute -right-3 -top-2">{badge(item)}</span>
              </span>
              {item.label}
            </NavLink>
          ))}
        </nav>
      )}

      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 top-4 z-50 flex justify-center px-5">
        {toast && (
          <p
            key={toast.key}
            role="status"
            className={`toast rounded-full px-5 py-3 text-sm font-semibold shadow-lg ${
              toast.tone === 'error' ? 'bg-danger text-paper' : 'bg-ink text-paper'
            }`}
          >
            {toast.message}
          </p>
        )}
      </div>
    </div>
  )
}
