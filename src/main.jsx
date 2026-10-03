import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, HashRouter } from 'react-router-dom'
import App from './App.jsx'
import { CartProvider } from './lib/cart.jsx'
import { CatalogProvider } from './lib/catalog.jsx'
import './styles/index.css'

// La demo de un solo archivo se abre sin servidor, por eso usa rutas con hash.
const Router = __DEMO__ ? HashRouter : BrowserRouter

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Router>
      <CatalogProvider>
        <CartProvider>
          <App />
        </CartProvider>
      </CatalogProvider>
    </Router>
  </StrictMode>,
)
