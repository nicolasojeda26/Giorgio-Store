import { Suspense, lazy } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import Header from './components/Header.jsx'
import Footer from './components/Footer.jsx'
import CartDrawer from './components/CartDrawer.jsx'
import Home from './pages/Home.jsx'
import PromoPage from './pages/PromoPage.jsx'
import Checkout from './pages/Checkout.jsx'
import Order from './pages/Order.jsx'
import NotFound from './pages/NotFound.jsx'

// El panel se descarga recién al entrar a /admin: no pesa en la tienda.
const AdminApp = lazy(() => import('./admin/AdminApp.jsx'))

export default function App() {
  const { pathname } = useLocation()

  if (pathname.startsWith('/admin')) {
    return (
      <Suspense fallback={<div className="min-h-svh bg-ink" />}>
        <Routes>
          <Route path="/admin/*" element={<AdminApp />} />
        </Routes>
      </Suspense>
    )
  }

  return (
    <>
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:bg-gold focus:px-4 focus:py-2 focus:text-ink"
      >
        Saltar al contenido
      </a>
      <Header />
      <main id="contenido">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/promo/:slug" element={<PromoPage />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/pedido/:id/:token?" element={<Order />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
      <CartDrawer />
    </>
  )
}
