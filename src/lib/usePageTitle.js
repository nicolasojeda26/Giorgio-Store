import { useEffect } from 'react'

const DEFAULT = 'Giorgio Perfumería · Promos de perfumes en Corrientes'

/** Título de la pestaña mientras la página está abierta. */
export function usePageTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} · Giorgio Perfumería` : DEFAULT
    return () => {
      document.title = DEFAULT
    }
  }, [title])
}
