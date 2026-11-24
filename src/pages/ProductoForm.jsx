import { useEffect, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { useApp, useData } from '../lib/app.jsx'
import { day, money, percent } from '../lib/format.js'
import {
  Field,
  MoneyInput,
  NumberInput,
  PageHeader,
  SaveBar,
  Switch,
  cardClass,
  inputClass,
  selectClass,
} from '../components/ui.jsx'

const EMPTY = {
  nombre: '',
  codigo: '',
  categoria: '',
  presentacion: '',
  costo: '',
  precio: '',
  stocks: {},
  stock_minimo: '',
  proveedor_id: '',
  activo: true,
}
const TIPOS = {
  ingreso: 'Ingreso',
  compra: 'Compra',
  venta: 'Venta',
  ajuste: 'Conteo',
  anulacion: 'Anulación',
  traspaso: 'Traspaso',
}

export default function ProductoForm() {
  const { id } = useParams()
  const nuevo = id === 'nuevo'
  const navigate = useNavigate()
  const { run, activas } = useApp()
  const { data } = useData('productos')
  const producto = data?.productos.find((p) => p.id === id)
  const [values, setValues] = useState(nuevo ? EMPTY : null)
  const [submitted, setSubmitted] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!nuevo && producto && !values)
      setValues({ ...EMPTY, ...producto, codigo: producto.codigo ?? '', proveedor_id: producto.proveedor_id ?? '' })
  }, [nuevo, producto, values])

  if (data && !nuevo && !producto) return <Navigate to="/productos" replace />
  if (!values) return <p className="text-mute-ink">Cargando…</p>

  const set = (field) => (value) => setValues((prev) => ({ ...prev, [field]: value }))
  const errors = {
    nombre: values.nombre.trim() ? undefined : 'Escribí el nombre.',
    precio: values.precio === '' ? 'Escribí el precio de venta.' : undefined,
  }
  const errorOf = (field) => (submitted ? errors[field] : undefined)
  const margen =
    Number(values.precio) > 0 ? (Number(values.precio) - Number(values.costo || 0)) / Number(values.precio) : null

  async function onSubmit(event) {
    event.preventDefault()
    setSubmitted(true)
    const first = Object.keys(errors).find((k) => errors[k])
    if (first) return document.getElementById(first)?.focus()
    setSaving(true)
    const { ok } = await run(
      'guardarProducto',
      {
        producto: {
          ...(nuevo ? {} : { id }),
          ...values,
          costo: Number(values.costo) || 0,
          precio: Number(values.precio) || 0,
          stocks: Object.fromEntries(Object.entries(values.stocks ?? {}).map(([k, v]) => [k, Number(v) || 0])),
          stock_minimo: Number(values.stock_minimo) || 0,
        },
      },
      nuevo ? 'Producto creado' : 'Producto guardado',
    )
    setSaving(false)
    if (ok) navigate('/productos')
  }

  return (
    <>
      <PageHeader title={nuevo ? 'Nuevo producto' : values.nombre || 'Producto'} back="/productos" />
      <form onSubmit={onSubmit} noValidate>
        <div className="grid gap-4 lg:grid-cols-2">
          <section className={`${cardClass} space-y-5 p-5`}>
            <Field id="nombre" label="Nombre" error={errorOf('nombre')}>
              <input
                id="nombre"
                maxLength={120}
                value={values.nombre}
                onChange={(e) => set('nombre')(e.target.value)}
                aria-invalid={Boolean(errorOf('nombre')) || undefined}
                className={inputClass}
              />
            </Field>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field id="presentacion" label="Presentación" optional hint="Por ejemplo: 100 ml.">
                <input
                  id="presentacion"
                  maxLength={40}
                  value={values.presentacion}
                  onChange={(e) => set('presentacion')(e.target.value)}
                  className={inputClass}
                />
              </Field>
              <Field id="categoria" label="Categoría" optional hint="Por ejemplo: Árabes, Decants.">
                <input
                  id="categoria"
                  maxLength={60}
                  value={values.categoria}
                  onChange={(e) => set('categoria')(e.target.value)}
                  className={inputClass}
                />
              </Field>
              <Field id="codigo" label="Código" optional>
                <input
                  id="codigo"
                  maxLength={40}
                  value={values.codigo}
                  onChange={(e) => set('codigo')(e.target.value)}
                  className={inputClass}
                />
              </Field>
              <Field id="proveedor" label="Proveedor" optional>
                <select
                  id="proveedor"
                  value={values.proveedor_id}
                  onChange={(e) => set('proveedor_id')(e.target.value)}
                  className={selectClass}
                >
                  <option value="">Sin proveedor</option>
                  {(data?.proveedores ?? []).map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          </section>

          <section className={`${cardClass} space-y-5 p-5`}>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field id="costo" label="Costo" hint="Lo que te cuesta cada unidad.">
                <MoneyInput id="costo" value={values.costo} onChange={set('costo')} />
              </Field>
              <Field id="precio" label="Precio de venta" error={errorOf('precio')}>
                <MoneyInput
                  id="precio"
                  value={values.precio}
                  onChange={set('precio')}
                  invalid={Boolean(errorOf('precio'))}
                />
              </Field>
            </div>
            {margen !== null && (
              <p className={`text-sm ${margen < 0.2 ? 'text-danger' : 'text-mute-ink'}`}>
                Ganás {money(Number(values.precio) - Number(values.costo || 0))} por unidad antes de comisiones (
                {percent(margen)} del precio).
              </p>
            )}
            <div className="grid gap-5 sm:grid-cols-2">
              {nuevo &&
                activas.map((l) => (
                  <Field key={l.id} id={`stock-${l.id}`} label={`Stock inicial en ${l.nombre}`} optional>
                    <NumberInput
                      id={`stock-${l.id}`}
                      value={values.stocks?.[l.id] ?? ''}
                      onChange={(v) => set('stocks')({ ...values.stocks, [l.id]: v })}
                    />
                  </Field>
                ))}
              <Field id="stock_minimo" label="Stock mínimo" hint="En cada local. Avisa cuando queda esto o menos.">
                <NumberInput id="stock_minimo" value={values.stock_minimo} onChange={set('stock_minimo')} />
              </Field>
            </div>
            {!nuevo && (
              <Switch
                checked={values.activo}
                onChange={set('activo')}
                label="Activo (si lo pausás, no aparece para vender)"
              />
            )}
          </section>
        </div>

        {!nuevo && <Movimientos productoId={id} />}
        <SaveBar saving={saving} cancelTo="/productos" label={nuevo ? 'Crear producto' : 'Guardar cambios'} />
      </form>
    </>
  )
}

function Movimientos({ productoId }) {
  const { data } = useData('movimientos', { productoId })
  if (!data?.length) return null
  return (
    <section className={`${cardClass} mt-4 p-5`} aria-labelledby="movs">
      <h2 id="movs" className="font-display text-[1.5rem]">
        Movimientos de stock
      </h2>
      <div
        className="mt-3 overflow-x-auto"
        tabIndex={0}
        role="region"
        aria-label="Tabla de movimientos, se puede desplazar"
      >
        <table className="w-full min-w-[32rem] text-left text-sm">
          <thead className="text-mute-ink">
            <tr>
              <th className="py-2 font-semibold">Fecha</th>
              <th className="font-semibold">Local</th>
              <th className="font-semibold">Tipo</th>
              <th className="text-right font-semibold">Cantidad</th>
              <th className="text-right font-semibold">Quedó</th>
              <th className="pl-4 font-semibold">Detalle</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {data.map((m) => (
              <tr key={m.id}>
                <td className="py-2">{day(m.created_at)}</td>
                <td>{m.sucursal}</td>
                <td>{TIPOS[m.tipo] ?? m.tipo}</td>
                <td className={`text-right tabular-nums ${m.cantidad < 0 ? 'text-danger' : 'text-ok'}`}>
                  {m.cantidad > 0 ? `+${m.cantidad}` : m.cantidad}
                </td>
                <td className="text-right tabular-nums">{m.stock_final}</td>
                <td className="pl-4 text-mute-ink">
                  {m.motivo}
                  {m.usuario && ` · ${m.usuario}`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
