import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { call, session as fetchSession } from './api.js'

/*
 * Estado general: usuario, datos de arranque (medios de pago, ajustes, stock bajo, ventas de hoy) y avisos.
 * Las pantallas piden sus propios datos con useData(); para guardar usan run(), que muestra el resultado.
 */
const AppContext = createContext(null)

export function AppProvider({ children }) {
  const [usuario, setUsuario] = useState(undefined) // undefined: verificando · null: sin sesión
  const [primerUso, setPrimerUso] = useState(false)
  const [bootError, setBootError] = useState(null)
  const [inicio, setInicio] = useState(null)
  const [toast, setToast] = useState(null)
  const [version, setVersion] = useState(0) // sube después de cada cambio: las pantallas vuelven a leer

  useEffect(() => {
    fetchSession()
      .then((data) => {
        setPrimerUso(Boolean(data.primerUso))
        setUsuario(data.usuario)
      })
      .catch((error) => {
        setBootError(error.message)
        setUsuario(null)
      })
  }, [])

  const refresh = useCallback(async () => {
    setInicio(await call('inicio'))
    setVersion((v) => v + 1)
  }, [])

  useEffect(() => {
    if (usuario) refresh().catch((error) => setBootError(error.message))
  }, [usuario, refresh])

  useEffect(() => {
    const expired = () => {
      setInicio(null)
      setUsuario(null)
    }
    window.addEventListener('giorgio:sesion-vencida', expired)
    return () => window.removeEventListener('giorgio:sesion-vencida', expired)
  }, [])

  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(null), 3500)
    return () => clearTimeout(timer)
  }, [toast])

  const notify = useCallback((message, tone = 'ok') => setToast({ message, tone, key: Date.now() }), [])

  /** Ejecuta una acción, avisa el resultado y refresca los datos. Devuelve { ok, result }. */
  const run = useCallback(
    async (action, payload, success) => {
      try {
        const result = await call(action, payload)
        if (success) notify(success)
        refresh().catch(() => {})
        return { ok: true, result }
      } catch (error) {
        notify(error.message, 'error')
        return { ok: false, error }
      }
    },
    [notify, refresh],
  )

  const login = useCallback(async (action, payload) => {
    const data = await call(action, payload)
    setPrimerUso(false)
    setUsuario(data.usuario)
  }, [])

  const logout = useCallback(async () => {
    await call('salir').catch(() => null)
    setInicio(null)
    setUsuario(null)
  }, [])

  const value = useMemo(
    () => ({
      usuario,
      dueno: usuario?.rol === 'dueno',
      primerUso,
      bootError,
      inicio,
      version,
      toast,
      notify,
      run,
      refresh,
      login,
      logout,
    }),
    [usuario, primerUso, bootError, inicio, version, toast, notify, run, refresh, login, logout],
  )
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export const useApp = () => useContext(AppContext)

/** Lee datos de una acción y los vuelve a leer después de cada cambio (o cuando cambian los parámetros). */
export function useData(action, payload = {}) {
  const { version } = useApp()
  const key = JSON.stringify(payload)
  const [state, setState] = useState({ data: null, error: null, loading: true })
  useEffect(() => {
    let alive = true
    setState((prev) => ({ ...prev, loading: true }))
    call(action, JSON.parse(key))
      .then((data) => alive && setState({ data, error: null, loading: false }))
      .catch((error) => alive && setState((prev) => ({ data: prev.data, error: error.message, loading: false })))
    return () => {
      alive = false
    }
  }, [action, key, version])
  return state
}
