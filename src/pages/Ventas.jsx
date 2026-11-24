import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { useApp, useData } from '../lib/app.jsx'
import { day, money, thisMonth } from '../lib/format.js'
import MonthPicker from '../components/MonthPicker.jsx'
import { Button, Confirm, Empty, PageHeader, Stat, cardClass } from '../components/ui.jsx'

export default function Ventas() {
  const { usuario, dueno, encargado, sucursal, nombreLocal, run, notify } = useApp()
  const todos = dueno && !sucursal
  const { state } = useLocation()
  const [mes, setMes] = useState(thisMonth())
  const { data, error } = useData('ventas', { mes })
  const [anular, setAnular] = useState(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (state?.nueva) notify(`Venta ${state.nueva} guardada`)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const ventas = data ?? []
  const validas = ventas.filter((v) => v.estado === 'ok')
  const total = validas.reduce((s, v) => s + v.total, 0)

  async function confirmar() {
    setBusy(true)
    await run('anularVenta', { id: anular.id }, `Venta ${anular.numero} anulada`)
    setBusy(false)
    setAnular(null)
  }

  return (
    <>
      <PageHeader
        title="Ventas"
        subtitle={
          usuario.rol === 'vendedor' ? 'Las que cargaste vos' : todos ? 'Todos los locales' : nombreLocal(sucursal)
        }
        action={
          <Link to="/ventas/nueva" className="btn btn-gold hidden sm:inline-flex">
            <Plus size={18} strokeWidth={2} aria-hidden="true" />
            Registrar venta
          </Link>
        }
      >
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <MonthPicker value={mes} onChange={setMes} />
          <Link to="/ventas/nueva" className="btn btn-gold w-full sm:hidden">
            <Plus size={18} strokeWidth={2} aria-hidden="true" />
            Registrar venta
          </Link>
        </div>
      </PageHeader>

      <div className="grid gap-3 sm:grid-cols-2">
        <Stat
          label={usuario.rol === 'vendedor' ? 'Vendiste en el mes' : 'Vendido en el mes'}
          value={money(total)}
          hint={validas.length === 1 ? '1 venta' : `${validas.length} ventas`}
        />
        {dueno && (
          <Stat
            label="Ganancia bruta de esas ventas"
            value={money(validas.reduce((s, v) => s + v.total - v.costo - v.comision, 0))}
            hint="Después del costo de la mercadería y las comisiones"
          />
        )}
      </div>

      {error && <p className="mt-4 text-danger">{error}</p>}
      {data && ventas.length === 0 && (
        <div className="mt-4">
          <Empty title="Sin ventas este mes">Las ventas que se registren aparecen acá.</Empty>
        </div>
      )}

      <ul className="mt-4 space-y-3">
        {ventas.map((v) => (
          <li key={v.id} className={`${cardClass} p-4 ${v.estado === 'anulada' ? 'opacity-60' : ''}`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold">
                  Venta {v.numero}
                  {v.estado === 'anulada' && (
                    <span className="ml-2 text-sm font-bold uppercase text-danger">Anulada</span>
                  )}
                </p>
                <p className="text-sm text-mute-ink">
                  {day(v.fecha)}
                  {todos && ` · ${v.sucursal}`} · {v.medio_nombre}
                  {v.cliente && ` · ${v.cliente}`}
                  {v.usuario && ` · cargó ${v.usuario}`}
                </p>
              </div>
              <p
                className={`text-[1.25rem] font-semibold tabular-nums ${v.estado === 'anulada' ? 'line-through' : ''}`}
              >
                {money(v.total)}
              </p>
            </div>
            <ul className="mt-2 text-sm">
              {(v.items ?? []).map((i, n) => (
                <li key={n} className="flex justify-between gap-3">
                  <span className="min-w-0 truncate">
                    {i.cantidad} × {i.nombre}
                  </span>
                  <span className="shrink-0 tabular-nums text-mute-ink">{money(i.precio * i.cantidad)}</span>
                </li>
              ))}
            </ul>
            {(v.descuento > 0 || v.nota) && (
              <p className="mt-1 text-sm text-mute-ink">
                {v.descuento > 0 && `Descuento ${money(v.descuento)}. `}
                {v.nota}
              </p>
            )}
            {encargado && v.estado === 'ok' && (
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3 text-sm">
                {dueno ? (
                  <span className="text-mute-ink">
                    Costo {money(v.costo)} · comisión {money(v.comision)} · queda{' '}
                    <strong className="text-ink">{money(v.total - v.costo - v.comision)}</strong>
                  </span>
                ) : (
                  <span />
                )}
                <Button variant="secondary" onClick={() => setAnular(v)} className="min-h-11 px-4">
                  Anular
                </Button>
              </div>
            )}
          </li>
        ))}
      </ul>

      <Confirm
        open={Boolean(anular)}
        title={`¿Anular la venta ${anular?.numero}?`}
        confirmLabel="Sí, anular"
        busy={busy}
        onConfirm={confirmar}
        onCancel={() => setAnular(null)}
      >
        Los productos vuelven al stock y el cobro sale de la caja.
      </Confirm>
    </>
  )
}
