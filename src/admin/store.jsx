import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useCatalog } from '../lib/catalog.jsx'
import { getAdminApi } from './api/index.js'
import { ERRORS } from './api/errors.js'

/*
 * Estado del panel: sesión, datos (promos, perfumes, pedidos, ajustes) y avisos.
 * Las pantallas llaman a run(...) para cada cambio: ejecuta la operación, vuelve a leer
 * los datos, actualiza la tienda y muestra el resultado.
 */
const AdminContext = createContext(null)

export function AdminProvider({ children }) {
  const { reload: reloadCatalog } = useCatalog()
  const [api, setApi] = useState(null)
  const [session, setSession] = useState(undefined) // undefined: verificando · null: sin sesión
  const [data, setData] = useState(null)
  const [loadError, setLoadError] = useState(null)
  const [toast, setToast] = useState(null)

  useEffect(() => {
    let alive = true
    getAdminApi()
      .then(async (instance) => {
        const current = await instance.getSession().catch(() => null)
        if (!alive) return
        setApi(instance)
        setSession(current)
      })
      .catch(() => alive && setSession(null))
    return () => {
      alive = false
    }
  }, [])

  const reload = useCallback(async () => {
    try {
      setData(await api.load())
      setLoadError(null)
    } catch (error) {
      setLoadError(error.message ?? ERRORS.cargar)
    }
  }, [api])

  useEffect(() => {
    if (api && session) reload()
  }, [api, session, reload])

  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(null), 3500)
    return () => clearTimeout(timer)
  }, [toast])

  const notify = useCallback((message, tone = 'ok') => setToast({ message, tone, key: Date.now() }), [])

  const run = useCallback(
    async (action, success) => {
      try {
        const result = await action(api)
        await reload()
        reloadCatalog()
        if (success) notify(success)
        return { ok: true, result }
      } catch (error) {
        notify(error.message ?? ERRORS.guardar, 'error')
        return { ok: false }
      }
    },
    [api, reload, reloadCatalog, notify],
  )

  const signIn = useCallback(
    async (email, password) => {
      setSession(await api.signIn(email, password))
    },
    [api],
  )

  const signOut = useCallback(async () => {
    await api.signOut()
    setData(null)
    setSession(null)
  }, [api])

  const value = useMemo(
    () => ({ demo: api?.mode === 'demo', api, session, data, loadError, toast, reload, run, notify, signIn, signOut }),
    [api, session, data, loadError, toast, reload, run, notify, signIn, signOut],
  )

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>
}

export const useAdmin = () => useContext(AdminContext)
