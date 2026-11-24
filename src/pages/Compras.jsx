import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Plus, TriangleAlert } from 'lucide-react'
import { useApp, useData } from '../lib/app.jsx'
import { CUENTAS, day, money, today } from '../lib/format.js'
import {
  Button,
  Chips,
  Confirm,
  Empty,
  ErrorText,
  Field,
  Modal,
  MoneyInput,
  PageHeader,
  Stat,
  Switch,
  cardClass,
  inputClass,
  selectClass,
} from '../components/ui.jsx'

export default function Compras() {
  const { sucursal, nombreLocal } = useApp()
  const [params, setParams] = useSearchParams()
  const vista = params.get('vista') ?? 'compras'
  const compras = useData('compras')
  const productos = useData('productos')
  const lista = compras.data ?? []
  const deudas = lista.filter((c) => c.estado === 'ok' && c.total > c.pagado)
  const totalDeuda = deudas.reduce((s, c) => s + c.total - c.pagado, 0)

  return (
    <>
      <PageHeader
        title="Compras"
        subtitle={sucursal ? `Llegadas a ${nombreLocal(sucursal)}` : 'Todos los locales'}
        action={
          <Link to="/compras/nueva" className="btn btn-gold min-h-12 px-5">
            <Plus size={18} strokeWidth={2} aria-hidden="true" />
            <span className="hidden sm:inline">Nueva compra</span>
            <span className="sm:hidden">Nueva</span>
          </Link>
        }
      />
      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <Stat
          label="Le debés a proveedores"
          value={money(totalDeuda)}
          tone={totalDeuda > 0 ? 'danger' : 'default'}
          hint={deudas.length === 1 ? '1 compra con saldo' : `${deudas.length} compras con saldo`}
        />
        <Stat
          label="Comprado este mes"
          value={money(
            lista
              .filter((c) => c.estado === 'ok' && String(c.fecha).slice(0, 7) === today().slice(0, 7))
              .reduce((s, c) => s + c.total, 0),
          )}
        />
      </div>
      <Chips
        label="Vista"
        value={vista}
        onChange={(v) => setParams(v === 'compras' ? {} : { vista: v }, { replace: true })}
        options={[
          { value: 'compras', label: 'Compras', count: lista.length },
          { value: 'deudas', label: 'Deudas', count: deudas.length },
          { value: 'proveedores', label: 'Proveedores', count: productos.data?.proveedores.length },
        ]}
      />
      <div className="mt-4">
        {vista === 'proveedores' ? (
          <Proveedores proveedores={productos.data?.proveedores ?? []} compras={lista} />
        ) : (
          <ListaCompras compras={vista === 'deudas' ? deudas : lista} loaded={Boolean(compras.data)} />
        )}
      </div>
    </>
  )
}

function ListaCompras({ compras, loaded }) {
  const { run } = useApp()
  const [pagar, setPagar] = useState(null)
  const [anular, setAnular] = useState(null)
  const [busy, setBusy] = useState(false)
  const hoy = today()

  if (loaded && !compras.length) return <Empty title="Nada por acá">Las compras a proveedores aparecen acá.</Empty>
  return (
    <>
      <ul className="space-y-3">
        {compras.map((c) => {
          const saldo = c.total - c.pagado
          const vencida = saldo > 0 && c.vencimiento && String(c.vencimiento).slice(0, 10) < hoy
          return (
            <li key={c.id} className={`${cardClass} p-4 ${c.estado === 'anulada' ? 'apagado' : ''}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold">
                    {c.proveedor ?? 'Sin proveedor'} · compra {c.numero}
                    {c.estado === 'anulada' && (
                      <span className="ml-2 text-sm font-bold uppercase text-danger">Anulada</span>
                    )}
                  </p>
                  <p className="text-sm text-mute-ink">
                    {day(c.fecha)} · llegó a {c.sucursal}
                    {c.vencimiento && saldo > 0 && (
                      <span className={vencida ? 'font-semibold text-danger' : ''}>
                        {' '}
                        · {vencida ? 'venció' : 'vence'} el {day(c.vencimiento)}
                      </span>
                    )}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[1.25rem] font-semibold tabular-nums">{money(c.total)}</p>
                  {c.estado === 'ok' && (
                    <p className={`text-sm tabular-nums ${saldo > 0 ? 'font-semibold text-danger' : 'text-ok'}`}>
                      {saldo > 0 ? `Debés ${money(saldo)}` : 'Pagada'}
                    </p>
                  )}
                </div>
              </div>
              <ul className="mt-2 text-sm">
                {(c.items ?? []).map((i, n) => (
                  <li key={n} className="flex justify-between gap-3">
                    <span className="min-w-0 truncate">
                      {i.cantidad} × {i.nombre}
                    </span>
                    <span className="shrink-0 tabular-nums text-mute-ink">{money(i.costo)} c/u</span>
                  </li>
                ))}
              </ul>
              {c.nota && <p className="mt-1 text-sm text-mute-ink">{c.nota}</p>}
              {c.estado === 'ok' && (
                <div className="mt-3 flex flex-wrap justify-end gap-2 border-t border-line pt-3">
                  <Button variant="secondary" onClick={() => setAnular(c)} className="min-h-11 px-4">
                    Anular
                  </Button>
                  {saldo > 0 && (
                    <Button onClick={() => setPagar(c)} className="min-h-11 px-4">
                      Registrar pago
                    </Button>
                  )}
                </div>
              )}
            </li>
          )
        })}
      </ul>
      <Pago compra={pagar} onClose={() => setPagar(null)} />
      <Confirm
        open={Boolean(anular)}
        title={`¿Anular la compra ${anular?.numero}?`}
        confirmLabel="Sí, anular"
        busy={busy}
        onConfirm={async () => {
          setBusy(true)
          await run('anularCompra', { id: anular.id }, 'Compra anulada')
          setBusy(false)
          setAnular(null)
        }}
        onCancel={() => setAnular(null)}
      >
        Se descuenta del stock lo que entró con esta compra y se borran sus pagos de la caja.
      </Confirm>
    </>
  )
}

function Pago({ compra, onClose }) {
  const { run, activas } = useApp()
  // Sale de la caja del local que se elija; arranca en el local al que llegó la compra.
  const [local, setLocal] = useState('')
  const localPago = local || compra?.sucursal_id || ''
  const saldo = compra ? compra.total - compra.pagado : 0
  const [monto, setMonto] = useState('')
  const [cuenta, setCuenta] = useState('efectivo')
  const [fecha, setFecha] = useState(today())
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const close = () => {
    setMonto('')
    setLocal('')
    setError(null)
    onClose()
  }
  return (
    <Modal open={Boolean(compra)} title="Registrar pago" onClose={close}>
      {compra && (
        <form
          noValidate
          className="space-y-5"
          onSubmit={async (e) => {
            e.preventDefault()
            const value = monto === '' ? saldo : Number(monto)
            if (!(value > 0) || value > saldo) return setError(`El pago tiene que ser entre $1 y ${money(saldo)}.`)
            setBusy(true)
            const { ok } = await run(
              'pagarCompra',
              { compraId: compra.id, monto: value, cuenta, fecha, sucursalId: localPago },
              'Pago registrado',
            )
            setBusy(false)
            if (ok) close()
          }}
        >
          <p className="text-mute-ink">
            {compra.proveedor ?? 'Compra'} {compra.numero}: se deben{' '}
            <strong className="text-ink">{money(saldo)}</strong>.
          </p>
          <Field id="monto" label="Monto" hint="Si lo dejás vacío, se paga todo el saldo.">
            <MoneyInput id="monto" value={monto} onChange={setMonto} />
          </Field>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field id="local-pago" label="Caja del local">
              <select
                id="local-pago"
                value={localPago}
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
            <Field id="cuenta" label="Sale de">
              <select id="cuenta" value={cuenta} onChange={(e) => setCuenta(e.target.value)} className={selectClass}>
                {Object.entries(CUENTAS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>
            <Field id="fecha-pago" label="Fecha">
              <input
                id="fecha-pago"
                type="date"
                max={today()}
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                className={inputClass}
              />
            </Field>
          </div>
          <ErrorText>{error}</ErrorText>
          <Button type="submit" busy={busy} className="w-full">
            Guardar pago
          </Button>
        </form>
      )}
    </Modal>
  )
}

function Proveedores({ proveedores, compras }) {
  const [editar, setEditar] = useState(null)
  const deudaDe = (id) =>
    compras.filter((c) => c.proveedor_id === id && c.estado === 'ok').reduce((s, c) => s + c.total - c.pagado, 0)
  return (
    <>
      <Button variant="secondary" onClick={() => setEditar({ nombre: '', telefono: '', notas: '', activo: true })}>
        <Plus size={16} strokeWidth={2} aria-hidden="true" />
        Nuevo proveedor
      </Button>
      {proveedores.length === 0 ? (
        <div className="mt-4">
          <Empty title="Sin proveedores">Cargalos para saber a quién le comprás y cuánto le debés.</Empty>
        </div>
      ) : (
        <ul className="mt-4 space-y-2">
          {proveedores.map((p) => {
            const deuda = deudaDe(p.id)
            return (
              <li
                key={p.id}
                className={`${cardClass} flex flex-wrap items-center justify-between gap-3 p-4 ${p.activo ? '' : 'apagado'}`}
              >
                <div className="min-w-0">
                  <p className="font-semibold">{p.nombre}</p>
                  <p className="text-sm text-mute-ink">
                    {[p.telefono, p.notas].filter(Boolean).join(' · ') || 'Sin datos de contacto'}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {deuda > 0 && (
                    <span className="flex items-center gap-1 text-sm font-semibold text-danger">
                      <TriangleAlert size={14} strokeWidth={2} aria-hidden="true" />
                      Debés {money(deuda)}
                    </span>
                  )}
                  <Button variant="secondary" onClick={() => setEditar(p)} className="min-h-11 px-4">
                    Editar
                  </Button>
                </div>
              </li>
            )
          })}
        </ul>
      )}
      <ProveedorForm proveedor={editar} onClose={() => setEditar(null)} />
    </>
  )
}

function ProveedorForm({ proveedor, onClose }) {
  const { run } = useApp()
  const [values, setValues] = useState(null)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const current = values ?? proveedor
  const set = (field) => (value) => setValues({ ...current, [field]: value })
  const close = () => {
    setValues(null)
    setError(null)
    onClose()
  }
  return (
    <Modal open={Boolean(proveedor)} title={proveedor?.id ? 'Editar proveedor' : 'Nuevo proveedor'} onClose={close}>
      {current && (
        <form
          noValidate
          className="space-y-5"
          onSubmit={async (e) => {
            e.preventDefault()
            if (!current.nombre.trim()) return setError('Escribí el nombre.')
            setBusy(true)
            const { ok } = await run('guardarProveedor', { proveedor: current }, 'Proveedor guardado')
            setBusy(false)
            if (ok) close()
          }}
        >
          <Field id="prov-nombre" label="Nombre">
            <input
              id="prov-nombre"
              maxLength={80}
              value={current.nombre}
              onChange={(e) => set('nombre')(e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field id="prov-tel" label="Teléfono" optional>
            <input
              id="prov-tel"
              type="tel"
              maxLength={40}
              value={current.telefono}
              onChange={(e) => set('telefono')(e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field id="prov-notas" label="Notas" optional hint="Por ejemplo: días de entrega, condiciones de pago.">
            <input
              id="prov-notas"
              maxLength={300}
              value={current.notas}
              onChange={(e) => set('notas')(e.target.value)}
              className={inputClass}
            />
          </Field>
          {current.id && <Switch checked={current.activo} onChange={set('activo')} label="Activo" />}
          <ErrorText>{error}</ErrorText>
          <Button type="submit" busy={busy} className="w-full">
            Guardar
          </Button>
        </form>
      )}
    </Modal>
  )
}
