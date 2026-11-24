import { useState } from 'react'
import { ArrowDownLeft, ArrowUpRight, Plus, Trash2 } from 'lucide-react'
import { useApp, useData } from '../lib/app.jsx'
import { CATEGORIAS, CUENTAS, day, money, thisMonth, today } from '../lib/format.js'
import MonthPicker from '../components/MonthPicker.jsx'
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
  cardClass,
  inputClass,
  selectClass,
} from '../components/ui.jsx'

const MANUALES = {
  ingreso: ['aporte', 'otro_ingreso'],
  egreso: ['gasto_fijo', 'gasto_variable', 'retiro', 'otro_egreso'],
}
// Aportes y retiros son plata del dueño: solo él los carga o los borra.
const DEL_DUENO = ['aporte', 'retiro']

export default function Caja() {
  const { run, dueno, sucursal, nombreLocal } = useApp()
  const todos = dueno && !sucursal
  const [mes, setMes] = useState(thisMonth())
  const { data, error } = useData('caja', { mes })
  const gastos = useData('gastosFijos')
  const [nuevo, setNuevo] = useState(null)
  const [borrar, setBorrar] = useState(null)
  const [cuenta, setCuenta] = useState('todas')
  const [busy, setBusy] = useState(false)

  const movimientos = (data?.movimientos ?? []).filter((m) => cuenta === 'todas' || m.cuenta === cuenta)
  const entradas = movimientos.filter((m) => m.tipo === 'ingreso').reduce((s, m) => s + m.monto, 0)
  const salidas = movimientos.filter((m) => m.tipo === 'egreso').reduce((s, m) => s + m.monto, 0)
  // Gastos fijos sin pagar este mes: los del local (y, para el dueño, también los generales del negocio).
  const pendientes = (gastos.data ?? []).filter(
    (g) => g.activo && g.monto > 0 && g.pagado_mes === 0 && (todos || !g.sucursal_id || g.sucursal_id === sucursal),
  )

  return (
    <>
      <PageHeader
        title="Caja"
        subtitle={todos ? 'Todos los locales' : nombreLocal(sucursal)}
        action={
          <Button variant="gold" onClick={() => setNuevo({ tipo: 'egreso' })}>
            <Plus size={18} strokeWidth={2} aria-hidden="true" />
            <span className="hidden sm:inline">Nuevo movimiento</span>
            <span className="sm:hidden">Nuevo</span>
          </Button>
        }
      >
        <p className="mt-2 max-w-prose text-mute-ink">
          La plata que entra y sale, por cuenta. Las ventas y los pagos a proveedores se anotan solos.
        </p>
      </PageHeader>

      <section aria-label="Saldos" className="grid gap-3 sm:grid-cols-3">
        {Object.entries(CUENTAS).map(([key, label]) => (
          <Stat
            key={key}
            label={`Saldo en ${label}`}
            value={data ? money(data.saldos[key]) : '…'}
            tone={data?.saldos[key] < 0 ? 'danger' : 'default'}
          />
        ))}
      </section>
      <p className="mt-2 text-sm text-mute-ink">
        Los saldos salen de todo lo cargado en el sistema. Si no coinciden con la realidad, cargá un aporte u otro
        movimiento para igualarlos.
      </p>

      {pendientes.length > 0 && mes === thisMonth() && (
        <section className={`${cardClass} mt-4 p-5`} aria-labelledby="pendientes">
          <h2 id="pendientes" className="font-display text-[1.5rem]">
            Gastos fijos sin pagar este mes
          </h2>
          <ul className="mt-3 divide-y divide-line">
            {pendientes.map((g) => (
              <li key={g.id} className="flex flex-wrap items-center justify-between gap-3 py-2.5">
                <span>
                  <span className="font-semibold">{g.nombre}</span>
                  <span className="text-sm text-mute-ink">
                    {' '}
                    · {todos || !g.sucursal_id ? `${g.sucursal ?? 'General'} · ` : ''}
                    {money(g.monto)}
                    {g.dia_pago && ` · vence el ${g.dia_pago}`}
                  </span>
                </span>
                <Button
                  variant="secondary"
                  className="min-h-11 px-4"
                  onClick={() =>
                    setNuevo({
                      tipo: 'egreso',
                      categoria: 'gasto_fijo',
                      gastoFijoId: g.id,
                      sucursalId: g.sucursal_id ?? sucursal,
                      monto: g.monto,
                      descripcion: g.nombre,
                    })
                  }
                >
                  Pagar
                </Button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <MonthPicker value={mes} onChange={setMes} />
        <p className="text-sm text-mute-ink">
          Entró <strong className="text-ok">{money(entradas)}</strong> · salió{' '}
          <strong className="text-danger">{money(salidas)}</strong>
        </p>
      </div>
      <div className="mt-3">
        <Chips
          label="Cuenta"
          value={cuenta}
          onChange={setCuenta}
          options={[
            { value: 'todas', label: 'Todas' },
            ...Object.entries(CUENTAS).map(([value, label]) => ({ value, label })),
          ]}
        />
      </div>

      {error && <p className="mt-4 text-danger">{error}</p>}
      {data && movimientos.length === 0 && (
        <div className="mt-4">
          <Empty title="Sin movimientos">No hay movimientos en este mes.</Empty>
        </div>
      )}
      <ul className="mt-4 divide-y divide-line rounded-md border border-line bg-white/55">
        {movimientos.map((m) => {
          const manual = !m.venta_id && !m.compra_id && (dueno || !DEL_DUENO.includes(m.categoria))
          return (
            <li key={m.id} className="flex items-center gap-3 px-4 py-3">
              <span
                className={`grid size-9 shrink-0 place-items-center rounded-full ${m.tipo === 'ingreso' ? 'bg-ok/10 text-ok' : 'bg-danger/10 text-danger'}`}
                aria-hidden="true"
              >
                {m.tipo === 'ingreso' ? (
                  <ArrowDownLeft size={18} strokeWidth={2} />
                ) : (
                  <ArrowUpRight size={18} strokeWidth={2} />
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline justify-between gap-3">
                  <span className="truncate font-semibold">
                    {m.descripcion || m.gasto_fijo || CATEGORIAS[m.categoria]}
                  </span>
                  <span className={`shrink-0 font-semibold tabular-nums ${m.tipo === 'ingreso' ? 'text-ok' : ''}`}>
                    {m.tipo === 'ingreso' ? '+' : '−'}
                    {money(m.monto)}
                  </span>
                </span>
                <span className="block truncate text-sm text-mute-ink">
                  {day(m.fecha)}
                  {todos && ` · ${m.sucursal}`} · {CATEGORIAS[m.categoria]} · {CUENTAS[m.cuenta]}
                  {m.proveedor && ` · ${m.proveedor}`}
                </span>
              </span>
              {manual ? (
                <button
                  type="button"
                  onClick={() => setBorrar(m)}
                  aria-label="Borrar movimiento"
                  className="grid size-11 shrink-0 place-items-center rounded-full text-mute-ink hover:text-danger"
                >
                  <Trash2 size={17} strokeWidth={1.8} />
                </button>
              ) : (
                <span className="size-11 shrink-0" />
              )}
            </li>
          )
        })}
      </ul>

      <Movimiento inicial={nuevo} gastos={gastos.data ?? []} onClose={() => setNuevo(null)} />
      <Confirm
        open={Boolean(borrar)}
        title="¿Borrar este movimiento?"
        confirmLabel="Sí, borrar"
        busy={busy}
        onConfirm={async () => {
          setBusy(true)
          await run('borrarMovimiento', { id: borrar.id }, 'Movimiento borrado')
          setBusy(false)
          setBorrar(null)
        }}
        onCancel={() => setBorrar(null)}
      >
        {borrar && `${borrar.descripcion || CATEGORIAS[borrar.categoria]} por ${money(borrar.monto)}.`}
      </Confirm>
    </>
  )
}

function Movimiento({ inicial, gastos, onClose }) {
  const { run, dueno, sucursal, activas } = useApp()
  const [values, setValues] = useState(null)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const v =
    values ??
    (inicial
      ? {
          tipo: 'egreso',
          categoria: '',
          cuenta: 'efectivo',
          monto: '',
          fecha: today(),
          descripcion: '',
          gastoFijoId: '',
          ...inicial,
          // Local de la caja: el elegido, el del gasto fijo o, con "Todos", el primero (se puede cambiar).
          sucursalId: inicial.sucursalId || sucursal || activas[0]?.id || '',
        }
      : null)
  const categorias = v ? MANUALES[v.tipo].filter((c) => dueno || !DEL_DUENO.includes(c)) : []
  // Gastos fijos que se pueden pagar desde la caja de ese local: los suyos y los generales.
  const gastosLocal = v ? gastos.filter((g) => !g.sucursal_id || g.sucursal_id === v.sucursalId) : []
  const set = (field) => (value) => setValues({ ...v, [field]: value })
  const close = () => {
    setValues(null)
    setError(null)
    onClose()
  }
  return (
    <Modal open={Boolean(inicial)} title="Nuevo movimiento" onClose={close}>
      {v && (
        <form
          noValidate
          className="space-y-5"
          onSubmit={async (e) => {
            e.preventDefault()
            if (!v.categoria) return setError('Elegí la categoría.')
            if (v.categoria === 'gasto_fijo' && !v.gastoFijoId) return setError('Elegí qué gasto fijo es.')
            if (!(Number(v.monto) > 0)) return setError('Escribí el monto.')
            setBusy(true)
            const { ok } = await run(
              'registrarMovimiento',
              { movimiento: { ...v, monto: Number(v.monto) } },
              'Movimiento guardado',
            )
            setBusy(false)
            if (ok) close()
          }}
        >
          <Chips
            label="Tipo de movimiento"
            value={v.tipo}
            onChange={(tipo) => setValues({ ...v, tipo, categoria: '', gastoFijoId: '' })}
            options={[
              { value: 'egreso', label: 'Sale plata' },
              { value: 'ingreso', label: 'Entra plata' },
            ]}
          />
          {dueno && !sucursal && (
            <Field id="local-mov" label="Caja del local">
              <select
                id="local-mov"
                value={v.sucursalId}
                onChange={(e) => setValues({ ...v, sucursalId: e.target.value, gastoFijoId: '' })}
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
          <Field id="categoria" label="Categoría">
            <select
              id="categoria"
              value={v.categoria}
              onChange={(e) => set('categoria')(e.target.value)}
              className={selectClass}
            >
              <option value="">Elegí una</option>
              {categorias.map((c) => (
                <option key={c} value={c}>
                  {CATEGORIAS[c]}
                </option>
              ))}
            </select>
          </Field>
          {v.categoria === 'gasto_fijo' && (
            <Field id="gasto" label="Gasto fijo">
              <select
                id="gasto"
                value={v.gastoFijoId}
                onChange={(e) => {
                  const g = gastos.find((x) => x.id === e.target.value)
                  setValues({ ...v, gastoFijoId: e.target.value, monto: v.monto || g?.monto || '' })
                }}
                className={selectClass}
              >
                <option value="">Elegí uno</option>
                {gastosLocal.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.nombre}
                    {g.sucursal_id ? '' : ' (general)'}
                  </option>
                ))}
              </select>
            </Field>
          )}
          <div className="grid gap-5 sm:grid-cols-2">
            <Field id="monto" label="Monto">
              <MoneyInput id="monto" value={v.monto} onChange={set('monto')} />
            </Field>
            <Field id="cuenta" label={v.tipo === 'ingreso' ? 'Entra a' : 'Sale de'}>
              <select
                id="cuenta"
                value={v.cuenta}
                onChange={(e) => set('cuenta')(e.target.value)}
                className={selectClass}
              >
                {Object.entries(CUENTAS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>
            <Field id="fecha-mov" label="Fecha">
              <input
                id="fecha-mov"
                type="date"
                max={today()}
                value={v.fecha}
                onChange={(e) => set('fecha')(e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field id="descripcion" label="Detalle" optional>
              <input
                id="descripcion"
                maxLength={200}
                value={v.descripcion}
                onChange={(e) => set('descripcion')(e.target.value)}
                className={inputClass}
              />
            </Field>
          </div>
          {v.categoria === 'retiro' && (
            <p className="text-sm text-mute-ink">
              El retiro no es un gasto: tu sueldo ya se cuenta en Finanzas con el monto de Ajustes.
            </p>
          )}
          <ErrorText>{error}</ErrorText>
          <Button type="submit" busy={busy} className="w-full">
            Guardar
          </Button>
        </form>
      )}
    </Modal>
  )
}
