import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { PackagePlus, Plus, Search } from 'lucide-react'
import { useApp, useData } from '../lib/app.jsx'
import { money, number, percent } from '../lib/format.js'
import {
  Button,
  Chips,
  Empty,
  ErrorText,
  Field,
  Modal,
  NumberInput,
  PageHeader,
  Stat,
  cardClass,
  inputClass,
} from '../components/ui.jsx'

const normalize = (s) =>
  String(s ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()

export default function Productos() {
  const { dueno } = useApp()
  const { data, error } = useData('productos')
  const [params, setParams] = useSearchParams()
  const filtro = params.get('filtro') ?? 'todos'
  const [query, setQuery] = useState('')
  const [mover, setMover] = useState(null) // { producto, tipo }

  const productos = data?.productos ?? []
  const activos = productos.filter((p) => p.activo)
  const grupos = {
    todos: activos,
    bajo: activos.filter((p) => p.stock <= p.stock_minimo),
    sin: activos.filter((p) => p.stock <= 0),
    inactivos: productos.filter((p) => !p.activo),
  }
  const lista = useMemo(() => {
    const q = normalize(query.trim())
    return (grupos[filtro] ?? activos).filter(
      (p) => !q || normalize(p.nombre).includes(q) || normalize(p.categoria).includes(q) || normalize(p.codigo) === q,
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productos, filtro, query])

  const valorCosto = activos.reduce((s, p) => s + Math.max(p.stock, 0) * (p.costo ?? 0), 0)
  const valorVenta = activos.reduce((s, p) => s + Math.max(p.stock, 0) * p.precio, 0)

  return (
    <>
      <PageHeader
        title="Stock"
        action={
          dueno && (
            <Link to="/productos/nuevo" className="btn btn-gold min-h-12 px-5">
              <Plus size={18} strokeWidth={2} aria-hidden="true" />
              <span className="hidden sm:inline">Nuevo producto</span>
              <span className="sm:hidden">Nuevo</span>
            </Link>
          )
        }
      />

      {dueno && (
        <div className="mb-4 grid gap-3 sm:grid-cols-3">
          <Stat label="Unidades en stock" value={number(activos.reduce((s, p) => s + Math.max(p.stock, 0), 0))} />
          <Stat label="Stock valorizado al costo" value={money(valorCosto)} />
          <Stat label="A precio de venta" value={money(valorVenta)} />
        </div>
      )}

      <div className="relative">
        <Search
          size={18}
          strokeWidth={1.8}
          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-mute-ink"
        />
        <input
          type="search"
          aria-label="Buscar producto"
          placeholder="Buscar por nombre, categoría o código"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className={`${inputClass} pl-10`}
        />
      </div>
      <div className="mt-3">
        <Chips
          label="Filtrar productos"
          value={filtro}
          onChange={(v) => setParams(v === 'todos' ? {} : { filtro: v }, { replace: true })}
          options={[
            { value: 'todos', label: 'Todos', count: grupos.todos.length },
            { value: 'bajo', label: 'Stock bajo', count: grupos.bajo.length },
            { value: 'sin', label: 'Sin stock', count: grupos.sin.length },
            ...(dueno ? [{ value: 'inactivos', label: 'Pausados', count: grupos.inactivos.length }] : []),
          ]}
        />
      </div>

      {error && <p className="mt-4 text-danger">{error}</p>}
      {data && lista.length === 0 && (
        <div className="mt-4">
          <Empty title={productos.length ? 'Nada por acá' : 'Todavía no hay productos'}>
            {productos.length
              ? 'Probá con otra búsqueda o filtro.'
              : dueno
                ? 'Cargá el primero con "Nuevo producto".'
                : ''}
          </Empty>
        </div>
      )}

      <ul className="mt-4 space-y-2">
        {lista.map((p) => {
          const bajo = p.stock <= p.stock_minimo
          const margen = dueno && p.precio > 0 ? (p.precio - p.costo) / p.precio : null
          return (
            <li key={p.id} className={`${cardClass} p-4`}>
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  {dueno ? (
                    <Link to={`/productos/${p.id}`} className="font-semibold underline-offset-4 hover:underline">
                      {p.nombre}
                    </Link>
                  ) : (
                    <p className="font-semibold">{p.nombre}</p>
                  )}
                  <p className="text-sm text-mute-ink">
                    {[p.presentacion, p.categoria, p.codigo && `Cód. ${p.codigo}`].filter(Boolean).join(' · ') || '—'}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-semibold tabular-nums">{money(p.precio)}</p>
                  {margen !== null && (
                    <p className={`text-sm tabular-nums ${margen < 0.2 ? 'text-danger' : 'text-mute-ink'}`}>
                      costo {money(p.costo)} · {percent(margen)}
                    </p>
                  )}
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3">
                <p className="tabular-nums">
                  <span className="text-sm text-mute-ink">Stock </span>
                  <span
                    className={`text-[1.25rem] font-semibold ${p.stock <= 0 ? 'text-danger' : bajo ? 'text-gold-deep' : ''}`}
                  >
                    {p.stock}
                  </span>
                  <span className="text-sm text-mute-ink"> · mín. {p.stock_minimo}</span>
                  {bajo && (
                    <span className="ml-2 text-sm font-semibold text-gold-deep">
                      {p.stock <= 0 ? 'Sin stock' : 'Reponer'}
                    </span>
                  )}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    onClick={() => setMover({ producto: p, tipo: 'ingreso' })}
                    className="min-h-11 px-3"
                  >
                    <PackagePlus size={16} strokeWidth={1.8} aria-hidden="true" />
                    Ingresar
                  </Button>
                  {dueno && (
                    <Button
                      variant="secondary"
                      onClick={() => setMover({ producto: p, tipo: 'ajuste' })}
                      className="min-h-11 px-3"
                    >
                      Contar
                    </Button>
                  )}
                </div>
              </div>
            </li>
          )
        })}
      </ul>

      <MoverStock mover={mover} onClose={() => setMover(null)} />
    </>
  )
}

function MoverStock({ mover, onClose }) {
  const { run } = useApp()
  const [cantidad, setCantidad] = useState('')
  const [motivo, setMotivo] = useState('')
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const ajuste = mover?.tipo === 'ajuste'

  const close = () => {
    setCantidad('')
    setMotivo('')
    setError(null)
    onClose()
  }

  async function onSubmit(event) {
    event.preventDefault()
    if (cantidad === '' || (!ajuste && Number(cantidad) < 1))
      return setError(ajuste ? 'Escribí cuántos hay.' : 'Escribí cuántos entraron.')
    setBusy(true)
    const { ok } = await run(
      'moverStock',
      { productoId: mover.producto.id, tipo: mover.tipo, cantidad: Number(cantidad), motivo },
      ajuste ? 'Stock corregido' : 'Stock ingresado',
    )
    setBusy(false)
    if (ok) close()
  }

  return (
    <Modal open={Boolean(mover)} title={ajuste ? 'Contar stock' : 'Ingresar mercadería'} onClose={close}>
      {mover && (
        <form onSubmit={onSubmit} noValidate className="space-y-5">
          <p className="text-mute-ink">
            {mover.producto.nombre}: hoy figuran <strong className="text-ink">{mover.producto.stock}</strong>.
            {ajuste ? ' Escribí cuántos contaste y el sistema corrige la diferencia.' : ' Sumá lo que entró.'}
          </p>
          <Field id="cantidad" label={ajuste ? 'Unidades contadas' : 'Unidades que entraron'}>
            <NumberInput id="cantidad" value={cantidad} onChange={setCantidad} autoFocus />
          </Field>
          <Field
            id="motivo"
            label="Motivo"
            optional
            hint={ajuste ? 'Por ejemplo: conteo, rotura, regalo.' : 'Por ejemplo: llegó pedido del proveedor.'}
          >
            <input
              id="motivo"
              maxLength={120}
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              className={inputClass}
            />
          </Field>
          {!ajuste && (
            <p className="text-sm text-mute-ink">
              Si es una compra con factura y precio, conviene cargarla en Compras: así suma la deuda y actualiza el
              costo.
            </p>
          )}
          <ErrorText>{error}</ErrorText>
          <Button type="submit" busy={busy} className="w-full">
            {ajuste ? 'Guardar conteo' : 'Sumar al stock'}
          </Button>
        </form>
      )}
    </Modal>
  )
}
