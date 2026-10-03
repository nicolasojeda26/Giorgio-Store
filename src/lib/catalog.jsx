import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import Logo from '../components/Logo.jsx'
import { site } from '../config/site.js'
import { BACKEND_ENABLED } from './backend.js'
import { fetchCatalog } from './catalogQueries.js'
import { demoCatalog, demoDb } from './demoDb.js'
import { getSupabase } from './supabase.js'

/*
 * Catálogo: promos activas, perfumes y datos de envío.
 *   - Con backend: se lee de Supabase (lo que el cliente carga en el panel).
 *   - Sin backend (modo de prueba): se lee de la base de prueba del navegador (lib/demoDb.js).
 * Todos los componentes lo consumen con useCatalog(), así no importa de dónde venga.
 */
const CatalogContext = createContext(null)
const CACHE_KEY = 'giorgio:catalogo:v1'

// Última versión vista en esta pestaña: evita la pantalla de carga al navegar o recargar.
function readCache() {
  try {
    return JSON.parse(sessionStorage.getItem(CACHE_KEY))
  } catch {
    return null
  }
}
function writeCache(data) {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(data))
  } catch {
    /* sin almacenamiento disponible: no pasa nada */
  }
}

function Screen({ children }) {
  return (
    <div className="grid min-h-svh place-items-center bg-ink px-6 text-center text-paper">
      <div>{children}</div>
    </div>
  )
}

export function CatalogProvider({ children }) {
  const [state, setState] = useState(() => {
    if (!BACKEND_ENABLED) return { status: 'ready', data: demoCatalog() }
    const cached = readCache()
    return cached ? { status: 'ready', data: cached } : { status: 'loading', data: null }
  })

  const reload = useCallback(async () => {
    if (!BACKEND_ENABLED) return setState({ status: 'ready', data: demoCatalog() })
    try {
      const data = await fetchCatalog(await getSupabase())
      writeCache(data)
      setState({ status: 'ready', data })
    } catch (error) {
      console.error('[catálogo]', error)
      // Si ya había algo en pantalla se deja; si no, se muestra el error con opción de reintentar.
      setState((prev) => (prev.data ? prev : { status: 'error', data: null }))
    }
  }, [])

  useEffect(() => {
    reload()
    // En modo de prueba, lo que se edita en el panel se refleja al instante en la tienda.
    if (!BACKEND_ENABLED) return demoDb.subscribe(reload)
  }, [reload])

  const value = useMemo(() => {
    const data = state.data ?? { promos: [], perfumes: [], shipping: site.shipping }
    // La promo destacada va primero: es la tarjeta grande de la landing.
    const promos = [...data.promos].sort((a, b) => Number(Boolean(b.featured)) - Number(Boolean(a.featured)))
    const promoBySlug = new Map(promos.map((p) => [p.slug, p]))
    const perfumeById = new Map(data.perfumes.map((p) => [p.id, p]))
    return {
      promos,
      perfumes: data.perfumes,
      shipping: data.shipping,
      getPromo: (slug) => promoBySlug.get(slug),
      getPerfume: (id) => perfumeById.get(id),
      getPerfumesByPromo: (slug) => data.perfumes.filter((p) => p.promos.includes(slug)),
      reload,
    }
  }, [state.data, reload])

  if (state.status === 'loading') {
    return (
      <Screen>
        <Logo className="animate-pulse" />
        <p className="sr-only" role="status">
          Cargando
        </p>
      </Screen>
    )
  }

  if (state.status === 'error') {
    return (
      <Screen>
        <Logo />
        <h1 className="mt-10 text-[2rem]">No pudimos cargar las promos</h1>
        <p className="mt-3 text-mute">Revisá tu conexión y probá de nuevo.</p>
        <button
          type="button"
          onClick={() => {
            setState({ status: 'loading', data: null })
            reload()
          }}
          className="btn btn-gold mt-8"
        >
          Reintentar
        </button>
      </Screen>
    )
  }

  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>
}

export const useCatalog = () => useContext(CatalogContext)
