import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Trash2 } from 'lucide-react'
import { useApp, useData } from '../lib/app.jsx'
import { CUENTAS, money, today } from '../lib/format.js'
import ProductPicker from '../components/ProductPicker.jsx'
import {
  Button,
  ErrorText,
  Field,
  MoneyInput,
  NumberInput,
  PageHeader,
  Switch,
  cardClass,
  inputClass,
  selectClass,
} from '../components/ui.jsx'

export default function NuevaCompra() {
  const { run } = useApp()
  const navigate = useNavigate()
  const { data } = useData('productos')
  const [items, setItems] = useState([])
  const [proveedorId, setProveedorId] = useState('')
  const [fecha, setFecha] = useState(today())
  const [vencimiento, setVencimiento] = useState('')
  const [pago, setPago] = useState('')
  const [cuenta, setCuenta] = useState('efectivo')
  const [actualizarCosto, setActualizarCosto] = useState(true)
  const [nota, setNota] = useState('')
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)

  const add = (p) =>
    setItems((prev) =>
      prev.some((i) => i.productoId === p.id)
        ? prev
        : [...prev, { productoId: p.id, nombre: p.nombre, presentacion: p.presentacion, cantidad: 1, costo: p.costo }],
    )
  const update = (index, patch) => setItems((prev) => prev.map((i, n) => (n === index ? { ...i, ...patch } : i)))
  const total = items.reduce((s, i) => s + (Number(i.cantidad) || 0) * (Number(i.costo) || 0), 0)
  const pagado = Number(pago) || 0

  async function onSubmit(event) {
    event.preventDefault()
    setError(null)
    if (!items.length) return setError('Agregá al menos un producto.')
    if (items.some((i) => !(Number(i.cantidad) > 0))) return setError('Revisá las cantidades.')
    if (pagado > total) return setError('Lo pagado no puede ser mayor que el total.')
    setSaving(true)
    const { ok } = await run(
      'registrarCompra',
      {
        compra: {
          proveedorId: proveedorId || null,
          fecha,
          vencimiento: pagado < total ? vencimiento || null : null,
          pago: pagado,
          cuenta,
          actualizarCosto,
          nota,
          items: items.map(({ productoId, cantidad, costo }) => ({
            productoId,
            cantidad: Number(cantidad),
            costo: Number(costo) || 0,
          })),
        },
      },
      'Compra guardada',
    )
    setSaving(false)
    if (ok) navigate('/compras')
  }

  return (
    <>
      <PageHeader title="Nueva compra" back="/compras" />
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <section className={`${cardClass} grid gap-5 p-5 sm:grid-cols-2`}>
          <Field id="proveedor" label="Proveedor" optional>
            <select
              id="proveedor"
              value={proveedorId}
              onChange={(e) => setProveedorId(e.target.value)}
              className={selectClass}
            >
              <option value="">Sin proveedor</option>
              {(data?.proveedores ?? [])
                .filter((p) => p.activo)
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre}
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
        </section>

        <section className={`${cardClass} p-5`}>
          <ProductPicker productos={data?.productos ?? []} onPick={add} label="Agregar producto" />
          {items.length > 0 && (
            <ul className="mt-5 divide-y divide-line border-t border-line">
              {items.map((item, index) => (
                <li key={item.productoId} className="grid gap-3 py-4 sm:grid-cols-[1fr_7rem_10rem_auto] sm:items-end">
                  <span className="min-w-0 sm:pb-3">
                    <span className="block font-semibold">{item.nombre}</span>
                    {item.presentacion && <span className="text-sm text-mute-ink">{item.presentacion}</span>}
                  </span>
                  <Field id={`cant-${index}`} label="Cantidad">
                    <NumberInput
                      id={`cant-${index}`}
                      value={item.cantidad}
                      onChange={(v) => update(index, { cantidad: v })}
                    />
                  </Field>
                  <Field id={`costo-${index}`} label="Costo c/u">
                    <MoneyInput
                      id={`costo-${index}`}
                      value={item.costo}
                      onChange={(v) => update(index, { costo: v })}
                    />
                  </Field>
                  <button
                    type="button"
                    onClick={() => setItems((prev) => prev.filter((_, n) => n !== index))}
                    aria-label={`Quitar ${item.nombre}`}
                    className="grid size-11 place-items-center justify-self-end rounded-full text-mute-ink hover:text-danger"
                  >
                    <Trash2 size={18} strokeWidth={1.8} />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-4 flex items-baseline justify-between border-t border-line pt-4">
            <span className="font-semibold">Total de la compra</span>
            <span className="text-[1.5rem] font-semibold tabular-nums">{money(total)}</span>
          </p>
          <div className="mt-4">
            <Switch
              checked={actualizarCosto}
              onChange={setActualizarCosto}
              label="Actualizar el costo de los productos con estos precios"
            />
          </div>
        </section>

        <section className={`${cardClass} grid gap-5 p-5 sm:grid-cols-2`}>
          <Field id="pago" label="Pagado ahora" hint="Lo que no pagues queda como deuda con el proveedor.">
            <MoneyInput id="pago" value={pago} onChange={setPago} />
          </Field>
          {pagado > 0 && (
            <Field id="cuenta" label="Sale de">
              <select id="cuenta" value={cuenta} onChange={(e) => setCuenta(e.target.value)} className={selectClass}>
                {Object.entries(CUENTAS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>
          )}
          {pagado < total && (
            <Field id="vencimiento" label="Vence el" optional hint={`Queda una deuda de ${money(total - pagado)}.`}>
              <input
                id="vencimiento"
                type="date"
                min={fecha}
                value={vencimiento}
                onChange={(e) => setVencimiento(e.target.value)}
                className={inputClass}
              />
            </Field>
          )}
          <div className="sm:col-span-2">
            <Field id="nota" label="Nota" optional hint="Por ejemplo: número de factura o remito.">
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

        <ErrorText>{error}</ErrorText>
        <Button type="submit" busy={saving} className="w-full sm:w-auto sm:px-10">
          Guardar compra
        </Button>
      </form>
    </>
  )
}
