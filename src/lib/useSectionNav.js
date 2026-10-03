import { useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

/**
 * Navega a una sección del inicio (#promos, #envios, ...).
 * Si estamos en otra página, primero vuelve al inicio y después hace scroll.
 */
export function useSectionNav() {
  const navigate = useNavigate()
  const { pathname } = useLocation()

  return useCallback(
    (id) => (event) => {
      event?.preventDefault()
      if (pathname !== '/') {
        navigate('/', { state: { scrollTo: id } })
        return
      }
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    },
    [navigate, pathname],
  )
}
