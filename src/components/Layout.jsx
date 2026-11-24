import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  Calculator,
  ChartColumn,
  House,
  LogOut,
  Menu,
  Package,
  Receipt,
  Settings,
  Truck,
  Wallet,
  X,
} from 'lucide-react'
import Logo from './Logo.jsx'
import { useApp } from '../lib/app.jsx'

const NAV = [
  { to: '/', label: 'Inicio', icon: House, end: true },
  { to: '/ventas', label: 'Ventas', icon: Receipt },
  { to: '/productos', label: 'Stock', icon: Package },
  { to: '/compras', label: 'Compras', icon: Truck, dueno: true },
  { to: '/caja', label: 'Caja', icon: Wallet, dueno: true },
  { to: '/finanzas', label: 'Finanzas', icon: ChartColumn, dueno: true },
  { to: '/calculadoras', label: 'Calculadoras', icon: Calculator, dueno: true },
  { to: '/ajustes', label: 'Ajustes', icon: Settings },
]
// En el celular, las tres más usadas van abajo; el resto, en "Más".
const TABS = ['/', '/ventas', '/productos']

export default function Layout() {
  const { usuario, dueno, inicio, toast, logout } = useApp()
  const { pathname } = useLocation()
  const [menu, setMenu] = useState(false)
  const items = NAV.filter((item) => !item.dueno || dueno)
  const bajos = inicio?.stockBajo.length ?? 0

  useEffect(() => setMenu(false), [pathname])

  const badge = (item) =>
    item.to === '/productos' && bajos > 0 ? (
      <span
        aria-label={`${bajos} con stock bajo`}
        className="grid h-5 min-w-5 place-items-center rounded-full bg-gold px-1.5 text-[0.6875rem] font-bold leading-none text-ink"
      >
        {bajos}
      </span>
    ) : null

  const link = (item, className) => (
    <NavLink key={item.to} to={item.to} end={item.end} className={className}>
      <item.icon size={19} strokeWidth={1.6} aria-hidden="true" />
      <span className="flex-1">{item.label}</span>
      {badge(item)}
    </NavLink>
  )

  const sideClass = ({ isActive }) =>
    `flex min-h-11 items-center gap-3 rounded-[3px] px-3 text-[0.9375rem] font-semibold transition-colors duration-150 ${
      isActive ? 'bg-paper text-ink' : 'text-paper/80 hover:text-paper'
    }`

  return (
    <div className="min-h-svh bg-paper text-ink lg:grid lg:grid-cols-[15rem_1fr]">
      <aside className="sticky top-0 hidden h-svh flex-col bg-ink p-6 text-paper lg:flex">
        <Link to="/" className="self-start">
          <Logo />
        </Link>
        <p className="eyebrow mt-3 text-gold">Stock y finanzas</p>
        <nav aria-label="Secciones" className="mt-8 flex flex-col gap-1">
          {items.map((item) => link(item, sideClass))}
        </nav>
        <div className="mt-auto space-y-1 border-t border-ink-3 pt-4 text-sm">
          <p className="truncate px-3 text-paper">{usuario.nombre}</p>
          <p className="truncate px-3 pb-2 text-mute">{dueno ? 'Dueño' : 'Empleado'}</p>
          <button
            type="button"
            onClick={logout}
            className="flex min-h-11 w-full items-center gap-3 px-3 text-paper/80 hover:text-paper"
          >
            <LogOut size={18} strokeWidth={1.6} aria-hidden="true" />
            Cerrar sesión
          </button>
        </div>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between bg-ink px-5 text-paper lg:hidden">
          <Link to="/" className="font-display text-[1.375rem] uppercase leading-none">
            Giorgio
          </Link>
          <span className="truncate pl-4 text-sm text-mute">{usuario.nombre}</span>
        </header>

        <main id="contenido" className="mx-auto w-full max-w-5xl px-5 pb-28 pt-6 lg:px-10 lg:pb-16 lg:pt-10">
          <Outlet />
        </main>

        {/* Celular: pestañas abajo */}
        <nav
          aria-label="Secciones"
          className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-ink-3 bg-ink pb-[env(safe-area-inset-bottom)] text-paper lg:hidden"
        >
          {items
            .filter((item) => TABS.includes(item.to))
            .map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `relative flex min-h-16 flex-col items-center justify-center gap-1 text-[0.6875rem] font-semibold ${
                    isActive ? 'text-gold' : 'text-paper/75'
                  }`
                }
              >
                <item.icon size={21} strokeWidth={1.6} aria-hidden="true" />
                {item.label}
                {item.to === '/productos' && bajos > 0 && (
                  <span className="absolute right-[calc(50%-1.375rem)] top-2 grid h-4 min-w-4 place-items-center rounded-full bg-gold px-1 text-[0.625rem] font-bold text-ink">
                    {bajos}
                  </span>
                )}
              </NavLink>
            ))}
          <button
            type="button"
            onClick={() => setMenu(true)}
            aria-expanded={menu}
            className="flex min-h-16 flex-col items-center justify-center gap-1 text-[0.6875rem] font-semibold text-paper/75"
          >
            <Menu size={21} strokeWidth={1.6} aria-hidden="true" />
            Más
          </button>
        </nav>

        {menu && (
          <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Más secciones">
            <button
              type="button"
              aria-label="Cerrar menú"
              className="absolute inset-0 bg-ink/60"
              onClick={() => setMenu(false)}
            />
            <div className="absolute inset-x-0 bottom-0 rounded-t-xl bg-ink p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] text-paper">
              <div className="flex items-center justify-between">
                <p className="eyebrow text-gold">Más secciones</p>
                <button
                  type="button"
                  onClick={() => setMenu(false)}
                  aria-label="Cerrar menú"
                  className="grid size-11 place-items-center rounded-full hover:bg-ink-3"
                >
                  <X size={20} strokeWidth={1.8} />
                </button>
              </div>
              <nav aria-label="Más secciones" className="mt-2 grid grid-cols-2 gap-2">
                {items
                  .filter((item) => !TABS.includes(item.to))
                  .map((item) =>
                    link(
                      item,
                      ({ isActive }) =>
                        `flex min-h-14 items-center gap-3 rounded-md border px-4 font-semibold ${
                          isActive ? 'border-gold text-gold' : 'border-ink-3 text-paper'
                        }`,
                    ),
                  )}
                <button
                  type="button"
                  onClick={logout}
                  className="flex min-h-14 items-center gap-3 rounded-md border border-ink-3 px-4 font-semibold text-paper"
                >
                  <LogOut size={19} strokeWidth={1.6} aria-hidden="true" />
                  Salir
                </button>
              </nav>
            </div>
          </div>
        )}
      </div>

      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 top-3 z-50 flex justify-center px-4">
        {toast && (
          <p
            key={toast.key}
            className={`toast pointer-events-auto rounded-full px-5 py-3 text-sm font-semibold shadow-lg ${
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
