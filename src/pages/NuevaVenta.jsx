import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Minus, Plus, Trash2, TriangleAlert } from 'lucide-react'
import { descuentoMedio } from '../../shared/finanzas.js'
import { useApp, useData } from '../lib/app.jsx'
import { money, today } from '../lib/format.js'
import ProductPicker from '../components/ProductPicker.jsx'
import {
  Button,
  ErrorText,
  Field,
  MoneyInput,
  PageHeader,
  cardClass,
  inputClass,
  selectClass,
} from '../components/ui.jsx'

export default function NuevaVenta() {
  const { dueno, inicio, run } = useApp()
  const navigate = useNavigate()
  const { data } = useData('productos')
  const productos = data?.productos ?? []
  const medios = inicio.medios.filter((m) => m.activo)

  const [items, setItems] = useState([])
  const [medioId, setMedioId] = useState(medios[0]?.id ?? '')
  const [descuento, setDescuento] = useState('')
  const [cliente, setCliente] = useState('')
  const [fecha, setFecha] = useState(today())
  const [nota, setNota] = useState('')
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)

  const add = (p) =>
    setItems((prev) => {
      const found = prev.find((i) => i.productoId === p.id)
      if (found) return prev.map((i) => (i === found ? { ...i, cantidad: i.cantidad + 1 } : i))
      return [
        ...prev,
        { productoId: p.id, nombre: p.nombre, presentacion: p.presentacion, cantidad: 1, precio: p.precio },
      ]
    })
  const update = (index, patch) => setItems((prev) => prev.map((i, n) => (n === index ? { ...i, ...patch } : i)))
  const remove = (index) => setItems((prev) => prev.filter((_, n) => n !== index))

  const subtotal = items.reduce((s, i) => s + (Number(i.cantidad) || 0) * (Number(i.precio) || 0), 0)
  const total = Math.max(subtotal - (Number(descuento) || 0), 0)
  const medio = medios.find((m) => m.id === medioId)
  const comision = dueno ? descuentoMedio(total, medio, inicio.ajustes.iva_comision).total : 0
  const costo = useMemo(
    () =>
      items.reduce(
        (s, i) => s + (productos.find((p) => p.id === i.productoId)?.costo ?? 0) * (Number(i.cantidad) || 0),
        0,
      ),
    [items, productos],
  )
  const sinStock = items.filter((i) => {
    const p = productos.find((x) => x.id === i.productoId)
    return p && p.stock < i.cantidad
  })

  async function onSubmit(event) {
    event.preventDefault()
    setError(null)
    if (!items.length) return setError('Agregá al menos un producto.')
    if (items.some((i) => !(Number(i.cantidad) > 0))) return setError('Revisá las cantidades.')
    if ((Number(descuento) || 0) > subtotal) return setError('El descuento no puede ser mayor que el total.')
    setSaving(true)
    const { ok, result } = await run(
      'registrarVenta',
      {
        venta: {
          medioPagoId: medioId,
          descuento: Number(descuento) || 0,
          cliente,
          fecha,
          nota,
          items: items.map(({ productoId, cantidad, precio }) => ({
            productoId,
            cantidad: Number(cantidad),
            precio: Number(precio) || 0,
          })),
        },
      },
      undefined,
    )
    setSaving(false)
    if (ok) navigate('/ventas', { state: { nueva: result.numero } })
  }

  return (
    <>
      <PageHeader title="Registrar venta" back="/ventas" />
      <form onSubmit={onSubmit} noValidate className="grid gap-4 lg:grid-cols-[1fr_20rem] lg:items-start">
        <div className="space-y-4">
          <section className={`${cardClass} p-5`}>
            <ProductPicker productos={productos} onPick={add} />
            {items.length > 0 && (
              <ul className="mt-5 divide-y divide-line border-t border-line" aria-label="Productos de la venta">
                {items.map((item, index) => (
                  <li
                    key={item.productoId}
                    className="grid gap-3 py-4 sm:grid-cols-[1fr_auto_9rem_auto] sm:items-center"
                  >
                    <span className="min-w-0">
                      <span className="block font-semibold">{item.nombre}</span>
                      {item.presentacion && <span className="text-sm text-mute-ink">{item.presentacion}</span>}
                    </span>
                    <div className="flex items-center gap-1" role="group" aria-label={`Cantidad de ${item.nombre}`}>
                      <button
                        type="button"
                        aria-label="Uno menos"
                        onClick={() => update(index, { cantidad: Math.max(1, item.cantidad - 1) })}
                        className="grid size-11 place-items-center rounded-full border border-ink/25"
                      >
                        <Minus size={16} strokeWidth={2} />
                      </button>
                      <span className="w-10 text-center font-semibold tabular-nums">{item.cantidad}</span>
                      <button
                        type="button"
                        aria-label="Uno más"
                        onClick={() => update(index, { cantidad: item.cantidad + 1 })}
                        className="grid size-11 place-items-center rounded-full border border-ink/25"
                      >
                        <Plus size={16} strokeWidth={2} />
                      </button>
                    </div>
                    <div>
                      <label htmlFor={`precio-${index}`} className="sr-only">
                        Precio de {item.nombre}
                      </label>
                      <MoneyInput
                        id={`precio-${index}`}
                        value={item.precio}
                        onChange={(v) => update(index, { precio: v })}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => remove(index)}
                      aria-label={`Quitar ${item.nombre}`}
                      className="grid size-11 place-items-center justify-self-end rounded-full text-mute-ink hover:bg-ink/5 hover:text-danger"
                    >
                      <Trash2 size={18} strokeWidth={1.8} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {sinStock.length > 0 && (
              <p className="mt-3 flex gap-2 text-sm text-danger">
                <TriangleAlert size={16} strokeWidth={2} className="mt-0.5 shrink-0" />
                No alcanza el stock de {sinStock.map((i) => i.nombre).join(', ')}. La venta se guarda igual y el stock
                queda en negativo hasta que se corrija.
              </p>
            )}
          </section>

          <section className={`${cardClass} grid gap-5 p-5 sm:grid-cols-2`}>
            <Field id="medio" label="Medio de pago">
              <select id="medio" value={medioId} onChange={(e) => setMedioId(e.target.value)} className={selectClass}>
                {medios.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nombre}
                  </option>
                ))}
              </select>
            </Field>
            <Field id="fecha" label="Fecha">
              <input
                id="fecha"
                type="date"
                max={today()}
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field id="descuento" label="Descuento" optional>
              <MoneyInput id="descuento" value={descuento} onChange={setDescuento} />
            </Field>
            <Field id="cliente" label="Cliente" optional>
              <input
                id="cliente"
                maxLength={80}
                value={cliente}
                onChange={(e) => setCliente(e.target.value)}
                className={inputClass}
              />
            </Field>
            <div className="sm:col-span-2">
              <Field id="nota" label="Nota" optional>
                <input
                  id="nota"
                  maxLength={200}
                  value={nota}
                  onChange={(e) => setNota(e.target.value)}
                  className={inputClass}
                />
              </Field>
            </div>
          </section>
        </div>

        <aside className="rounded-md bg-ink p-5 text-paper lg:sticky lg:top-10" aria-label="Total de la venta">
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-mute">Subtotal</dt>
              <dd className="tabular-nums">{money(subtotal)}</dd>
            </div>
            {Number(descuento) > 0 && (
              <div className="flex justify-between">
                <dt className="text-mute">Descuento</dt>
                <dd className="tabular-nums">−{money(descuento)}</dd>
              </div>
            )}
            <div className="flex items-baseline justify-between border-t border-ink-3 pt-3">
              <dt className="font-semibold">Total</dt>
              <dd className="price text-[2.25rem] text-gold">{money(total)}</dd>
            </div>
            {dueno && total > 0 && (
              <>
                <div className="flex justify-between">
                  <dt className="text-mute">Comisión {medio?.nombre}</dt>
                  <dd className="tabular-nums">−{money(comision)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-mute">Costo de la mercadería</dt>
                  <dd className="tabular-nums">−{money(costo)}</dd>
                </div>
                <div className="flex justify-between font-semibold">
                  <dt>Te queda</dt>
                  <dd className={`tabular-nums ${total - comision - costo < 0 ? 'text-danger-bright' : ''}`}>
                    {money(total - comision - costo)}
                  </dd>
                </div>
              </>
            )}
          </dl>
          <ErrorText>{error}</ErrorText>
          <Button type="submit" variant="gold" busy={saving} className="mt-5 w-full">
            Guardar venta
          </Button>
        </aside>
      </form>
    </>
  )
}
