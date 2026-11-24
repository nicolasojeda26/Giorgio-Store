import { useState } from 'react'
import { ArrowRight, Minus, Plus, Trash2, TriangleAlert } from 'lucide-react'
import { useApp, useData } from '../lib/app.jsx'
import { day } from '../lib/format.js'
import ProductPicker from '../components/ProductPicker.jsx'
import {
  Button,
  Confirm,
  Empty,
  ErrorText,
  Field,
  Modal,
  PageHeader,
  cardClass,
  inputClass,
  selectClass,
} from '../components/ui.jsx'

/**
 * Traspasos de mercadería entre locales. El encargado manda desde su local; el dueño, de cualquiera a cualquiera.
 * La mercadería sale de un local y entra en el otro en el mismo momento.
 */
export default function Traspasos() {
  const { dueno, sucursal, nombreLocal, run } = useApp()
  const { data, error } = useData('traspasos')
  const [nuevo, setNuevo] = useState(false)
  const [anular, setAnular] = useState(null)
  const [busy, setBusy] = useState(false)
  const lista = data ?? []

  async function confirmar() {
    setBusy(true)
    await run('anularTraspaso', { id: anular.id }, `Traspaso ${anular.numero} anulado`)
    setBusy(false)
    setAnular(null)
  }

  return (
    <>
      <PageHeader
        title="Traspasos"
        subtitle={dueno && !sucursal ? 'Todos los locales' : nombreLocal(sucursal)}
        action={
          <Button variant="gold" onClick={() => setNuevo(true)} className="min-h-12 px-5">
            <Plus size={18} strokeWidth={2} aria-hidden="true" />
            <span className="hidden sm:inline">Nuevo traspaso</span>
            <span className="sm:hidden">Nuevo</span>
          </Button>
        }
      >
        <p className="mt-2 max-w-prose text-mute-ink">
          Mercadería que se manda de un local al otro. Sale del stock de uno y entra en el del otro.
        </p>
      </PageHeader>

      {error && <p className="text-danger">{error}</p>}
      {data && lista.length === 0 && (
        <Empty title="Sin traspasos todavía">Cuando mandes mercadería al otro local, queda anotado acá.</Empty>
      )}

      <ul className="space-y-3">
        {lista.map((t) => (
          <li key={t.id} className={`${cardClass} p-4 ${t.estado === 'anulado' ? 'opacity-60' : ''}`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-x-2 font-semibold">
                  <span>{t.origen}</span>
                  <ArrowRight size={16} strokeWidth={2} aria-label="a" />
                  <span>{t.destino}</span>
                  {t.estado === 'anulado' && <span className="text-sm font-bold uppercase text-danger">Anulado</span>}
                </p>
                <p className="text-sm text-mute-ink">
                  Traspaso {t.numero} · {day(t.fecha)}
                  {t.usuario && ` · cargó ${t.usuario}`}
                </p>
              </div>
              <p className="text-sm font-semibold tabular-nums">
                {(t.items ?? []).reduce((s, i) => s + i.cantidad, 0)} u.
              </p>
            </div>
            <ul className="mt-2 text-sm">
              {(t.items ?? []).map((i, n) => (
                <li key={n}>
                  {i.cantidad} × {i.nombre}
                </li>
              ))}
            </ul>
            {t.nota && <p className="mt-1 text-sm text-mute-ink">{t.nota}</p>}
            {dueno && t.estado === 'ok' && (
              <div className="mt-3 flex justify-end border-t border-line pt-3">
                <Button variant="secondary" onClick={() => setAnular(t)} className="min-h-11 px-4">
                  Anular
                </Button>
              </div>
            )}
          </li>
        ))}
      </ul>

      <NuevoTraspaso open={nuevo} onClose={() => setNuevo(false)} />

      <Confirm
        open={Boolean(anular)}
        title={`¿Anular el traspaso ${anular?.numero}?`}
        confirmLabel="Sí, anular"
        busy={busy}
        onConfirm={confirmar}
        onCancel={() => setAnular(null)}
      >
        La mercadería vuelve a {anular?.origen}.
      </Confirm>
    </>
  )
}

function NuevoTraspaso({ open, onClose }) {
  const { dueno, usuario, sucursal, activas, nombreLocal, run, notify } = useApp()
  // El encargado siempre manda desde su local.
  const [origen, setOrigen] = useState(dueno ? sucursal || activas[0]?.id || '' : usuario.sucursal_id)
  const destinos = activas.filter((l) => l.id !== origen)
  const [destino, setDestino] = useState('')
  const destinoId = destinos.some((l) => l.id === destino) ? destino : (destinos[0]?.id ?? '')
  const { data } = useData(open ? 'productos' : null, { sucursalId: origen || null })
  const productos = data?.productos ?? []
  const [items, setItems] = useState([])
  const [nota, setNota] = useState('')
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)

  const disponible = (productoId) => productos.find((p) => p.id === productoId)?.stock ?? 0
  const add = (p) =>
    setItems((prev) =>
      prev.some((i) => i.productoId === p.id)
        ? prev.map((i) => (i.productoId === p.id ? { ...i, cantidad: i.cantidad + 1 } : i))
        : [...prev, { productoId: p.id, nombre: p.nombre, cantidad: 1 }],
    )
  const update = (index, cantidad) =>
    setItems((prev) => prev.map((i, n) => (n === index ? { ...i, cantidad: Math.max(1, cantidad) } : i)))
  const faltan = items.filter((i) => i.cantidad > disponible(i.productoId))

  const close = () => {
    setItems([])
    setNota('')
    setError(null)
    onClose()
  }

  async function onSubmit(event) {
    event.preventDefault()
    setError(null)
    if (!destinoId) return setError('Hace falta otro local activo para mandar mercadería.')
    if (!items.length) return setError('Agregá al menos un producto.')
    if (faltan.length) return setError(`No hay tanto stock de ${faltan.map((i) => i.nombre).join(', ')}.`)
    setSaving(true)
    const { ok, result } = await run('registrarTraspaso', {
      traspaso: {
        origenId: origen,
        destinoId,
        nota,
        items: items.map(({ productoId, cantidad }) => ({ productoId, cantidad })),
      },
    })
    setSaving(false)
    if (ok) {
      close()
      notify(`Traspaso ${result.numero} guardado`)
    }
  }

  return (
    <Modal open={open} title="Nuevo traspaso" onClose={close} wide>
      <form onSubmit={onSubmit} noValidate className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          {dueno ? (
            <Field id="origen" label="Sale de">
              <select
                id="origen"
                value={origen}
                onChange={(e) => {
                  setOrigen(e.target.value)
                  setItems([])
                }}
                className={selectClass}
              >
                {activas.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.nombre}
                  </option>
                ))}
              </select>
            </Field>
          ) : (
            <div>
              <p className="text-[0.9375rem] font-semibold">Sale de</p>
              <p className="mt-2 flex min-h-12 items-center">{nombreLocal(origen)}</p>
            </div>
          )}
          <Field id="destino" label="Llega a">
            <select id="destino" value={destinoId} onChange={(e) => setDestino(e.target.value)} className={selectClass}>
              {destinos.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.nombre}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <ProductPicker productos={productos} onPick={add} label="Agregar producto" />

        {items.length > 0 && (
          <ul className="divide-y divide-line border-y border-line" aria-label="Productos del traspaso">
            {items.map((item, index) => {
              const hay = disponible(item.productoId)
              return (
                <li key={item.productoId} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <span className="min-w-0">
                    <span className="block font-semibold">{item.nombre}</span>
                    <span className={`text-sm ${item.cantidad > hay ? 'text-danger' : 'text-mute-ink'}`}>
                      Hay {hay} en {nombreLocal(origen)}
                    </span>
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="flex items-center gap-1" role="group" aria-label={`Cantidad de ${item.nombre}`}>
                      <button
                        type="button"
                        aria-label="Uno menos"
                        onClick={() => update(index, item.cantidad - 1)}
                        className="grid size-11 place-items-center rounded-full border border-ink/25"
                      >
                        <Minus size={16} strokeWidth={2} />
                      </button>
                      <span className="w-10 text-center font-semibold tabular-nums">{item.cantidad}</span>
                      <button
                        type="button"
                        aria-label="Uno más"
                        onClick={() => update(index, item.cantidad + 1)}
                        className="grid size-11 place-items-center rounded-full border border-ink/25"
                      >
                        <Plus size={16} strokeWidth={2} />
                      </button>
                    </span>
                    <button
                      type="button"
                      onClick={() => setItems((prev) => prev.filter((_, n) => n !== index))}
                      aria-label={`Quitar ${item.nombre}`}
                      className="grid size-11 place-items-center rounded-full text-mute-ink hover:bg-ink/5 hover:text-danger"
                    >
                      <Trash2 size={18} strokeWidth={1.8} />
                    </button>
                  </span>
                </li>
              )
            })}
          </ul>
        )}
        {faltan.length > 0 && (
          <p className="flex gap-2 text-sm text-danger">
            <TriangleAlert size={16} strokeWidth={2} className="mt-0.5 shrink-0" />
            No se puede mandar más de lo que hay en el local de origen.
          </p>
        )}

        <Field id="nota-traspaso" label="Nota" optional>
          <input
            id="nota-traspaso"
            maxLength={200}
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            className={inputClass}
          />
        </Field>
        <ErrorText>{error}</ErrorText>
        <Button type="submit" busy={saving} className="w-full">
          Guardar traspaso
        </Button>
      </form>
    </Modal>
  )
}
