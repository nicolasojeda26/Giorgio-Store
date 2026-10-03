import { useCallback, useMemo, useState } from 'react'

/**
 * Selección de perfumes de un combo. Se puede repetir el mismo perfume;
 * el total nunca supera `quantity` (la cantidad que define la promo).
 */
export function useCombo(quantity) {
  const [selection, setSelection] = useState([])

  const add = useCallback((id) => setSelection((prev) => (prev.length < quantity ? [...prev, id] : prev)), [quantity])

  // Quita la última unidad agregada de ese perfume.
  const remove = useCallback(
    (id) =>
      setSelection((prev) => {
        const index = prev.lastIndexOf(id)
        return index === -1 ? prev : prev.filter((_, i) => i !== index)
      }),
    [],
  )

  const removeAt = useCallback((index) => setSelection((prev) => prev.filter((_, i) => i !== index)), [])
  const clear = useCallback(() => setSelection([]), [])

  const counts = useMemo(() => selection.reduce((acc, id) => ({ ...acc, [id]: (acc[id] ?? 0) + 1 }), {}), [selection])

  const missing = quantity - selection.length

  return { selection, counts, missing, full: missing === 0, add, remove, removeAt, clear }
}
