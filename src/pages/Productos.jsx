import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { PackagePlus, Plus, Search } from 'lucide-react'
import { useApp, useData } from '../lib/app.jsx'
import { money, number, percent } from '../lib/format.js'
import {
  Button,
  Chips,
  selectClass,
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

// Stock bajo: igual que en el inicio (solo cuenta si tiene mínimo cargado, o si quedó en negativo).
const esBajo = (stock, minimo) => (minimo > 0 && stock <= minimo) || stock < 0
const stockEn = (p, id) => p.stocks?.[id] ?? 0

const normalize = (s) =>
  String(s ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()

export default function Productos() {
  const { dueno, encargado, sucursal, activas } = useApp()
  const { data, error } = useData('productos')
  // Dueño con "Todos los locales": se ve el stock de cada local y al ingresar o contar se elige dónde.
  const todos = dueno && !sucursal
  const bajoEnAlguno = (p) =>
    todos ? activas.some((l) => esBajo(stockEn(p, l.id), p.stock_minimo)) : esBajo(p.stock, p.stock_minimo)
  const sinEnAlguno = (p) => (todos ? activas.some((l) => stockEn(p, l.id) <= 0) : p.stock <= 0)
  const [params, setParams] = useSearchParams()
  const filtro = params.get('filtro') ?? 'todos'
  const [query, setQuery] = useState('')
  const [mover, setMover] = useState(null) // { producto, tipo }

  const productos = data?.productos ?? []
  const activos = productos.filter((p) => p.activo)
  const grupos = {
    todos: activos,
    bajo: activos.filter(bajoEnAlguno),
    sin: activos.filter(sinEnAlguno),
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
        subtitle={dueno ? (todos ? 'Todos los locales' : activas.find((l) => l.id === sucursal)?.nombre) : null}
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
          const bajo = bajoEnAlguno(p)
          const otros = activas.filter((l) => l.id !== sucursal)
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
                {todos ? (
                  <ul
                    className="flex flex-wrap gap-x-5 gap-y-1 tabular-nums"
                    aria-label={`Stock de ${p.nombre} por local`}
                  >
                    {activas.map((l) => {
                      const st = stockEn(p, l.id)
                      return (
                        <li key={l.id}>
                          <span className="text-sm text-mute-ink">{l.nombre} </span>
                          <span
                            className={`text-[1.25rem] font-semibold ${st <= 0 ? 'text-danger' : esBajo(st, p.stock_minimo) ? 'text-gold-deep' : ''}`}
                          >
                            {st}
                          </span>
                        </li>
                      )
                    })}
                    <li className="self-center text-sm text-mute-ink">mín. {p.stock_minimo} c/u</li>
                  </ul>
                ) : (
                  <div className="tabular-nums">
                    <p>
                      <span className="text-sm text-mute-ink">Stock </span>
                      <span
                        className={`text-[1.25rem] font-semibold ${p.stock <= 0 ? 'text-danger' : bajo ? 'text-gold-deep' : ''}`}
                      >
                        {p.stock}
                      </span>
                      <span className="text-sm text-mute-ink"> · mín. {p.stock_minimo}</span>
                      {(bajo || p.stock <= 0) && (
                        <span className="ml-2 text-sm font-semibold text-gold-deep">
                          {p.stock <= 0 ? 'Sin stock' : 'Reponer'}
                        </span>
                      )}
                    </p>
                    {otros.length > 0 && (
                      <p className="text-sm text-mute-ink">
                        {otros.map((l) => `En ${l.nombre}: ${stockEn(p, l.id)}`).join(' · ')}
                      </p>
                    )}
                  </div>
                )}
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    onClick={() => setMover({ producto: p, tipo: 'ingreso' })}
                    className="min-h-11 px-3"
                  >
                    <PackagePlus size={16} strokeWidth={1.8} aria-hidden="true" />
                    Ingresar
                  </Button>
                  {encargado && (
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
  const { run, dueno, sucursal, activas } = useApp()
  // Con "Todos los locales", el dueño elige en cuál; si no, es el local elegido o el del empleado.
  const elegir = dueno && !sucursal
  const [local, setLocal] = useState('')
  const destino = elegir ? local || activas[0]?.id : sucursal
  const actual = mover ? (elegir ? stockEn(mover.producto, destino) : mover.producto.stock) : 0
  const [cantidad, setCantidad] = useState('')
  const [motivo, setMotivo] = useState('')
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const ajuste = mover?.tipo === 'ajuste'

  const close = () => {
    setCantidad('')
    setMotivo('')
    setLocal('')
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
      { productoId: mover.producto.id, sucursalId: destino, tipo: mover.tipo, cantidad: Number(cantidad), motivo },
      ajuste ? 'Stock corregido' : 'Stock ingresado',
    )
    setBusy(false)
    if (ok) close()
  }

  return (
    <Modal open={Boolean(mover)} title={ajuste ? 'Contar stock' : 'Ingresar mercadería'} onClose={close}>
      {mover && (
        <form onSubmit={onSubmit} noValidate className="space-y-5">
          {elegir && (
            <Field id="local-stock" label="Local">
              <select
                id="local-stock"
                value={destino}
                onChange={(e) => setLocal(e.target.value)}
                className={selectClass}
              >
                {activas.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.nombre}
                  </option>
                ))}
              </select>
            </Field>
          )}
          <p className="text-mute-ink">
            {mover.producto.nombre}: hoy figuran <strong className="text-ink">{actual}</strong>.
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
