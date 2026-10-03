import { Navigate, Route, Routes } from 'react-router-dom'
import Logo from '../components/Logo.jsx'
import { usePageTitle } from '../lib/usePageTitle.js'
import Layout from './Layout.jsx'
import { AdminProvider, useAdmin } from './store.jsx'
import { Button } from './ui.jsx'
import Login from './pages/Login.jsx'
import Orders from './pages/Orders.jsx'
import OrderDetail from './pages/OrderDetail.jsx'
import Promos from './pages/Promos.jsx'
import PromoForm from './pages/PromoForm.jsx'
import Perfumes from './pages/Perfumes.jsx'
import PerfumeForm from './pages/PerfumeForm.jsx'
import SettingsPage from './pages/Settings.jsx'

function Screen({ children }) {
  return <div className="grid min-h-svh place-items-center bg-ink px-6 text-center text-paper">{children}</div>
}

function Gate() {
  const { session, data, loadError, reload } = useAdmin()

  if (session === undefined) {
    return (
      <Screen>
        <div>
          <Logo className="animate-pulse" />
          <p className="sr-only" role="status">
            Cargando el panel
          </p>
        </div>
      </Screen>
    )
  }
  if (!session) return <Login />

  if (!data) {
    return (
      <Screen>
        <div>
          <Logo className={loadError ? '' : 'animate-pulse'} />
          {loadError ? (
            <>
              <p className="mt-8 max-w-sm text-mute">{loadError}</p>
              <Button variant="secondary" onClick={reload} className="mt-6 border-ink-3 text-paper hover:border-gold">
                Reintentar
              </Button>
            </>
          ) : (
            <p className="sr-only" role="status">
              Cargando los datos
            </p>
          )}
        </div>
      </Screen>
    )
  }

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Navigate to="pedidos" replace />} />
        <Route path="pedidos" element={<Orders />} />
        <Route path="pedidos/:id" element={<OrderDetail />} />
        <Route path="promos" element={<Promos />} />
        <Route path="promos/:id" element={<PromoForm />} />
        <Route path="perfumes" element={<Perfumes />} />
        <Route path="perfumes/:id" element={<PerfumeForm />} />
        <Route path="ajustes" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="pedidos" replace />} />
      </Route>
    </Routes>
  )
}

/** Panel de administración (/admin). Se descarga aparte de la tienda. */
export default function AdminApp() {
  usePageTitle('Panel')
  return (
    <AdminProvider>
      <Gate />
    </AdminProvider>
  )
}
