import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useCatalog } from './catalog.jsx'

/*
 * Carrito. Cada ítem es un combo ya armado: { id, promoSlug, perfumeIds }.
 * El precio no se guarda: siempre se toma de la promo, así un cambio de precio se refleja solo.
 * Al pagar, el servidor vuelve a validar el carrito y calcula el total (ver api/_lib/orders.js).
 */
const STORAGE_KEY = 'giorgio:carrito:v1'
const CartContext = createContext(null)

function load() {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
    return Array.isArray(data) ? data : []
  } catch {
    return [] // sin almacenamiento disponible (modo privado, vista previa): el carrito vive solo en memoria
  }
}

const newId = () =>
  globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`

export function CartProvider({ children }) {
  const { getPromo, getPerfume } = useCatalog()
  const [stored, setStored] = useState(load)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stored))
    } catch {
      /* ver load() */
    }
  }, [stored])

  // Un combo guardado deja de valer si la promo se dio de baja o cambió, o si un perfume ya no se puede elegir.
  const isValid = useCallback(
    (item) => {
      const promo = getPromo(item?.promoSlug)
      return (
        Boolean(promo) &&
        Array.isArray(item.perfumeIds) &&
        item.perfumeIds.length === promo.quantity &&
        item.perfumeIds.every((id) => {
          const perfume = getPerfume(id)
          return perfume?.stock && perfume.promos.includes(promo.slug)
        })
      )
    },
    [getPromo, getPerfume],
  )

  const addCombo = useCallback(
    (promoSlug, perfumeIds) => {
      const item = { id: newId(), promoSlug, perfumeIds: [...perfumeIds] }
      if (!isValid(item)) return
      setStored((prev) => [...prev, item])
      setOpen(true)
    },
    [isValid],
  )

  const removeItem = useCallback((id) => setStored((prev) => prev.filter((item) => item.id !== id)), [])
  const clear = useCallback(() => setStored([]), [])
  const openCart = useCallback(() => setOpen(true), [])
  const closeCart = useCallback(() => setOpen(false), [])

  const value = useMemo(() => {
    const items = stored.filter(isValid)
    const subtotal = items.reduce((sum, item) => sum + getPromo(item.promoSlug).price, 0)
    return { items, count: items.length, subtotal, addCombo, removeItem, clear, open, openCart, closeCart }
  }, [stored, isValid, getPromo, open, addCombo, removeItem, clear, openCart, closeCart])

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export const useCart = () => useContext(CartContext)
