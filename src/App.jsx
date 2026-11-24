import { Suspense, lazy } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import Logo from './components/Logo.jsx'
import { useApp } from './lib/app.jsx'
import Login from './pages/Login.jsx'
import Inicio from './pages/Inicio.jsx'
import Ventas from './pages/Ventas.jsx'
import NuevaVenta from './pages/NuevaVenta.jsx'
import Productos from './pages/Productos.jsx'
import ProductoForm from './pages/ProductoForm.jsx'
import Ajustes from './pages/Ajustes.jsx'

// Lo que solo usa el dueño se descarga recién cuando entra.
const Compras = lazy(() => import('./pages/Compras.jsx'))
const NuevaCompra = lazy(() => import('./pages/NuevaCompra.jsx'))
const Caja = lazy(() => import('./pages/Caja.jsx'))
const Finanzas = lazy(() => import('./pages/Finanzas.jsx'))
const Calculadoras = lazy(() => import('./pages/Calculadoras.jsx'))

function Loading() {
  return (
    <div className="grid min-h-svh place-items-center bg-ink text-paper">
      <div className="animate-pulse">
        <Logo />
      </div>
    </div>
  )
}

export default function App() {
  const { usuario, dueno, inicio } = useApp()
  if (usuario === undefined) return <Loading />
  if (!usuario) return <Login />
  if (!inicio) return <Loading />

  const soloDueno = (element) => (dueno ? element : <Navigate to="/" replace />)
  return (
    <Suspense fallback={<p className="p-10 text-mute-ink">Cargando…</p>}>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Inicio />} />
          <Route path="ventas" element={<Ventas />} />
          <Route path="ventas/nueva" element={<NuevaVenta />} />
          <Route path="productos" element={<Productos />} />
          <Route path="productos/:id" element={soloDueno(<ProductoForm />)} />
          <Route path="compras" element={soloDueno(<Compras />)} />
          <Route path="compras/nueva" element={soloDueno(<NuevaCompra />)} />
          <Route path="caja" element={soloDueno(<Caja />)} />
          <Route path="finanzas" element={soloDueno(<Finanzas />)} />
          <Route path="calculadoras" element={soloDueno(<Calculadoras />)} />
          <Route path="ajustes" element={<Ajustes />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </Suspense>
  )
}
