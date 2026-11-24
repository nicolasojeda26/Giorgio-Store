import { useState } from 'react'
import { Link } from 'react-router-dom'
import { CircleAlert, Pencil, Plus, Trash2 } from 'lucide-react'
import { useApp, useData } from '../lib/app.jsx'
import { day, money, monthName, number, percent, thisMonth } from '../lib/format.js'
import MonthPicker from '../components/MonthPicker.jsx'
import {
  Button,
  Chips,
  Confirm,
  ErrorText,
  Field,
  Modal,
  MoneyInput,
  NumberInput,
  PageHeader,
  Stat,
  Switch,
  cardClass,
  inputClass,
  selectClass,
} from '../components/ui.jsx'

export default function Finanzas() {
  const { sucursal, nombreLocal } = useApp()
  const [mes, setMes] = useState(thisMonth())
  const { data, error } = useData('finanzas', { mes })

  return (
    <>
      <PageHeader title="Finanzas" subtitle={sucursal ? nombreLocal(sucursal) : 'Todos los locales'}>
        <div className="mt-4">
          <MonthPicker value={mes} onChange={setMes} />
        </div>
      </PageHeader>
      {error && <p className="text-danger">{error}</p>}
      {!data ? (
        <p className="text-mute-ink">Calculando…</p>
      ) : (
        <>
          <Resultado data={data} />
          {!data.sucursalId && data.porLocal.length > 1 && <PorLocal data={data} />}
          <Equilibrio data={data} />
          <VentasPorDia dias={data.dias} mes={data.mes} />
          <Rentabilidad productos={data.productos} />
          <GastosFijos />
          <Patrimonio data={data} />
        </>
      )}
    </>
  )
}

function Resultado({ data }) {
  const r = data.resumen
  const local = Boolean(data.sucursalId)
  const gastos = local
    ? [['Gastos fijos del local', -data.gastosFijos]]
    : [
        ['Gastos fijos de los locales', -(data.gastosFijos - data.gastosGenerales)],
        ['Gastos generales del negocio', -data.gastosGenerales, 'Los que no son de un local (monotributo, etc.)'],
        ['Tu sueldo', -data.sueldoDueno, data.sueldoDueno ? undefined : 'Cargalo en Ajustes para que cuente'],
      ]
  const filas = [
    [
      'Ventas',
      r.ventas,
      `${data.cantidadVentas === 1 ? '1 venta' : `${data.cantidadVentas} ventas`} · ${number(data.unidades)} unidades`,
    ],
    ['Costo de la mercadería vendida', -r.costoMercaderia],
    ['Comisiones de medios de pago', -r.comisiones],
    ['Margen de contribución', r.contribucion, `${percent(r.margenContribucion)} de lo vendido`, true],
    ...gastos,
    ['Gastos variables y otros', -r.otrosEgresos, 'Los egresos de Caja de esas categorías'],
  ]
  return (
    <section aria-labelledby="resultado" className="grid gap-4 lg:grid-cols-[1fr_18rem]">
      <div className={`${cardClass} p-5`}>
        <h2 id="resultado" className="font-display text-[1.5rem]">
          Resultado de {monthName(data.mes).split(' ')[0]}
        </h2>
        <dl className="mt-3 divide-y divide-line">
          {filas.map(([label, value, hint, strong]) => (
            <div
              key={label}
              className={`flex items-baseline justify-between gap-4 py-2.5 ${strong ? 'font-semibold' : ''}`}
            >
              <dt>
                {label}
                {hint && <span className="block text-sm font-normal text-mute-ink">{hint}</span>}
              </dt>
              <dd className={`shrink-0 tabular-nums ${value < 0 ? 'text-mute-ink' : ''}`}>{money(value)}</dd>
            </div>
          ))}
          <div className="flex items-baseline justify-between gap-4 pt-3">
            <dt className="text-[1.125rem] font-semibold">
              {local ? 'Resultado del local' : r.resultado >= 0 ? 'Ganancia del mes' : 'Pérdida del mes'}
            </dt>
            <dd className={`text-[1.5rem] font-semibold tabular-nums ${r.resultado >= 0 ? 'text-ok' : 'text-danger'}`}>
              {money(r.resultado)}
            </dd>
          </div>
        </dl>
        {local && (
          <p className="mt-3 text-sm text-mute-ink">
            Es lo que deja este local antes de los gastos generales y tu sueldo. El resultado del negocio completo está
            en &quot;Todos los locales&quot;.
          </p>
        )}
      </div>
      <div className="grid content-start gap-3">
        <Stat tone={r.resultado >= 0 ? 'ok' : 'danger'} label="Resultado" value={money(r.resultado)} />
        <Stat
          label="Margen de contribución"
          value={percent(r.margenContribucion)}
          hint="De cada $100 vendidos, lo que queda para pagar gastos"
        />
        <Stat
          label="Ganancia por unidad"
          value={data.unidades ? money(r.contribucion / data.unidades) : '—'}
          hint="Promedio, después de costo y comisiones"
        />
      </div>
    </section>
  )
}

function Equilibrio({ data }) {
  const pe = data.resumen.equilibrio
  return (
    <section aria-labelledby="pe" className={`${cardClass} mt-4 p-5`}>
      <h2 id="pe" className="font-display text-[1.5rem]">
        Punto de equilibrio
      </h2>
      {!pe.posible ? (
        <p className="mt-2 flex gap-2 text-mute-ink">
          <CircleAlert size={18} strokeWidth={2} className="mt-0.5 shrink-0" />
          Hace falta al menos una venta con ganancia en el mes para calcularlo. Mientras tanto, usá la calculadora de
          punto de equilibrio en{' '}
          <Link to="/calculadoras?c=equilibrio" className="font-semibold underline">
            Calculadoras
          </Link>
          .
        </p>
      ) : (
        <>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <Stat
              label="Hay que vender"
              value={money(pe.ventas)}
              hint={
                data.sucursalId
                  ? `Para cubrir ${money(pe.fijos)} de gastos fijos del local`
                  : `Para cubrir ${money(pe.fijos)} de gastos fijos y sueldo`
              }
            />
            <Stat
              label="En unidades"
              value={pe.unidades ? number(pe.unidades) : '—'}
              hint="Con la ganancia por unidad del mes"
            />
            <Stat
              label={pe.avance >= 1 ? 'Superado' : 'Falta vender'}
              value={pe.avance >= 1 ? money(data.resumen.ventas - pe.ventas) : money(pe.falta)}
              tone={pe.avance >= 1 ? 'ok' : 'default'}
              hint={pe.avance >= 1 ? 'Por encima del equilibrio' : `Vas ${percent(pe.avance)}`}
            />
          </div>
          <div
            className="mt-4 h-3 overflow-hidden rounded-full bg-ink/10"
            role="progressbar"
            aria-label="Avance hacia el punto de equilibrio"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(Math.min(pe.avance, 1) * 100)}
          >
            <div
              className={`h-full rounded-full ${pe.avance >= 1 ? 'bg-ok' : 'bg-gold'}`}
              style={{ width: `${Math.min(pe.avance, 1) * 100}%` }}
            />
          </div>
          <p className="mt-3 text-sm text-mute-ink">
            Se calcula con el margen de contribución real del mes ({percent(data.resumen.margenContribucion)}): gastos
            fijos y sueldo ÷ margen.
          </p>
        </>
      )}
    </section>
  )
}

/** Ventas por día del mes: una sola serie, barras finas. Cada barra muestra su valor al pasar el mouse o con el foco. */
function VentasPorDia({ dias, mes }) {
  if (!dias.length) return null
  const [y, m] = mes.split('-').map(Number)
  const cantidad = new Date(y, m, 0).getDate()
  const porDia = new Map(dias.map((d) => [String(d.fecha).slice(8, 10), d]))
  const max = Math.max(...dias.map((d) => d.total))
  const mejor = dias.reduce((a, b) => (b.total > a.total ? b : a))
  return (
    <section aria-labelledby="dias" className={`${cardClass} mt-4 p-5`}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="dias" className="font-display text-[1.5rem]">
          Ventas por día
        </h2>
        <p className="text-sm text-mute-ink">
          Mejor día: {day(mejor.fecha)}, {money(mejor.total)}
        </p>
      </div>
      <div
        className="mt-4 flex h-40 items-end gap-[2px] border-b border-ink/20"
        role="list"
        aria-label="Ventas de cada día del mes"
      >
        {Array.from({ length: cantidad }, (_, i) => {
          const dd = String(i + 1).padStart(2, '0')
          const d = porDia.get(dd)
          const alto = d ? Math.max((d.total / max) * 100, 2) : 0
          const label = d ? `${i + 1}: ${money(d.total)} en ${d.ventas} ventas` : `${i + 1}: sin ventas`
          return (
            <div
              key={dd}
              role="listitem"
              tabIndex={d ? 0 : -1}
              aria-label={label}
              className="group relative flex h-full flex-1 items-end outline-none"
            >
              {d && (
                <div
                  className="w-full rounded-t-[4px] bg-gold-deep group-hover:bg-ink group-focus:bg-ink"
                  style={{ height: `${alto}%` }}
                />
              )}
              {d && (
                <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded bg-ink px-2 py-1 text-xs text-paper group-hover:block group-focus:block">
                  {label}
                </span>
              )}
            </div>
          )
        })}
      </div>
      <div className="mt-1 flex justify-between text-xs text-mute-ink" aria-hidden="true">
        <span>1</span>
        <span>15</span>
        <span>{cantidad}</span>
      </div>
    </section>
  )
}

function Rentabilidad({ productos }) {
  const [orden, setOrden] = useState('ganancia')
  if (!productos.length) return null
  const lista = [...productos].sort((a, b) =>
    orden === 'margen' ? b.ganancia / (b.ventas || 1) - a.ganancia / (a.ventas || 1) : b[orden] - a[orden],
  )
  return (
    <section aria-labelledby="rent" className={`${cardClass} mt-4 p-5`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="rent" className="font-display text-[1.5rem]">
          Rentabilidad por producto
        </h2>
        <Chips
          label="Ordenar por"
          value={orden}
          onChange={setOrden}
          options={[
            { value: 'ganancia', label: 'Ganancia' },
            { value: 'unidades', label: 'Unidades' },
            { value: 'margen', label: 'Margen' },
          ]}
        />
      </div>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[34rem] text-left text-sm">
          <thead className="text-mute-ink">
            <tr>
              <th className="py-2 font-semibold">Producto</th>
              <th className="text-right font-semibold">Unid.</th>
              <th className="text-right font-semibold">Vendido</th>
              <th className="text-right font-semibold">Costo + comisión</th>
              <th className="text-right font-semibold">Ganancia</th>
              <th className="text-right font-semibold">Margen</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {lista.map((p) => (
              <tr key={p.id}>
                <td className="py-2 pr-3">{p.nombre}</td>
                <td className="text-right tabular-nums">{p.unidades}</td>
                <td className="text-right tabular-nums">{money(p.ventas)}</td>
                <td className="text-right tabular-nums text-mute-ink">{money(p.costo + p.comision)}</td>
                <td className={`text-right font-semibold tabular-nums ${p.ganancia < 0 ? 'text-danger' : ''}`}>
                  {money(p.ganancia)}
                </td>
                <td className="text-right tabular-nums">{percent(p.ventas ? p.ganancia / p.ventas : 0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

/** Con "Todos los locales": cuánto deja cada local y cómo se llega al resultado del negocio. */
function PorLocal({ data }) {
  const locales = data.porLocal
  const suma = locales.reduce((s, l) => s + l.resultado, 0)
  return (
    <section aria-labelledby="locales" className={`${cardClass} mt-4 p-5`}>
      <h2 id="locales" className="font-display text-[1.5rem]">
        Cada local
      </h2>
      <p className="text-sm text-mute-ink">
        Lo que deja cada local después de su mercadería, comisiones, gastos fijos y gastos variables.
      </p>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[36rem] text-left text-sm">
          <thead className="text-mute-ink">
            <tr>
              <th scope="col" className="py-2 font-semibold">
                Local
              </th>
              <th scope="col" className="text-right font-semibold">
                Ventas
              </th>
              <th scope="col" className="text-right font-semibold">
                Margen
              </th>
              <th scope="col" className="text-right font-semibold">
                Gastos fijos
              </th>
              <th scope="col" className="text-right font-semibold">
                Variables
              </th>
              <th scope="col" className="text-right font-semibold">
                Resultado
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {locales.map((l) => (
              <tr key={l.id}>
                <th scope="row" className="py-2.5 font-semibold">
                  {l.nombre}
                </th>
                <td className="text-right tabular-nums">{money(l.ventas)}</td>
                <td className="text-right tabular-nums">
                  {money(l.contribucion)}
                  <span className="block text-xs text-mute-ink">
                    {l.ventas ? percent(l.contribucion / l.ventas) : '—'}
                  </span>
                </td>
                <td className="text-right tabular-nums text-mute-ink">{money(-l.fijos)}</td>
                <td className="text-right tabular-nums text-mute-ink">{money(-l.variables)}</td>
                <td className={`text-right font-semibold tabular-nums ${l.resultado >= 0 ? 'text-ok' : 'text-danger'}`}>
                  {money(l.resultado)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="border-t-2 border-ink/20">
            <tr>
              <th scope="row" colSpan={5} className="py-2 font-normal text-mute-ink">
                Suma de los locales
              </th>
              <td className="text-right tabular-nums">{money(suma)}</td>
            </tr>
            <tr>
              <th scope="row" colSpan={5} className="py-2 font-normal text-mute-ink">
                Gastos generales y tu sueldo
              </th>
              <td className="text-right tabular-nums text-mute-ink">
                {money(-(data.gastosGenerales + data.sueldoDueno))}
              </td>
            </tr>
            <tr>
              <th scope="row" colSpan={5} className="py-2 font-semibold">
                Resultado del negocio
              </th>
              <td
                className={`text-right font-semibold tabular-nums ${data.resumen.resultado >= 0 ? 'text-ok' : 'text-danger'}`}
              >
                {money(data.resumen.resultado)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  )
}

function GastosFijos() {
  const { run, sucursal } = useApp()
  // Siempre todos: los generales y los de cada local, cada uno con su etiqueta.
  const { data } = useData('gastosFijos', { sucursalId: null })
  const [editar, setEditar] = useState(null)
  const [borrar, setBorrar] = useState(null)
  const [busy, setBusy] = useState(false)
  const gastos = data ?? []
  const total = gastos.filter((g) => g.activo).reduce((s, g) => s + g.monto, 0)
  return (
    <section aria-labelledby="fijos" className={`${cardClass} mt-4 p-5`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="fijos" className="font-display text-[1.5rem]">
            Gastos fijos por mes
          </h2>
          <p className="text-sm text-mute-ink">Lo que se paga todos los meses, se venda o no. Total: {money(total)}.</p>
        </div>
        <Button
          variant="secondary"
          onClick={() =>
            setEditar({ nombre: '', monto: '', dia_pago: '', activo: true, sucursal_id: sucursal || null })
          }
          className="min-h-11 px-4"
        >
          <Plus size={16} strokeWidth={2} aria-hidden="true" />
          Agregar
        </Button>
      </div>
      <ul className="mt-3 divide-y divide-line">
        {gastos.map((g) => (
          <li key={g.id} className={`flex items-center gap-3 py-2 ${g.activo ? '' : 'opacity-50'}`}>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-semibold">{g.nombre}</span>
              <span className="text-sm text-mute-ink">
                {g.sucursal ?? 'General'}
                {g.dia_pago && ` · vence el día ${g.dia_pago}`}
              </span>
            </span>
            <span className={`tabular-nums ${g.monto === 0 ? 'text-mute-ink' : ''}`}>{money(g.monto)}</span>
            <button
              type="button"
              onClick={() => setEditar(g)}
              aria-label={`Editar ${g.nombre}`}
              className="grid size-11 place-items-center rounded-full hover:bg-ink/5"
            >
              <Pencil size={16} strokeWidth={1.8} />
            </button>
            <button
              type="button"
              onClick={() => setBorrar(g)}
              aria-label={`Borrar ${g.nombre}`}
              className="grid size-11 place-items-center rounded-full text-mute-ink hover:text-danger"
            >
              <Trash2 size={16} strokeWidth={1.8} />
            </button>
          </li>
        ))}
      </ul>
      {gastos.some((g) => g.monto === 0) && (
        <p className="mt-2 text-sm text-mute-ink">
          Los que están en $0 no cuentan: completá los montos reales para que el punto de equilibrio sea exacto.
        </p>
      )}
      <GastoForm gasto={editar} onClose={() => setEditar(null)} />
      <Confirm
        open={Boolean(borrar)}
        title={`¿Borrar ${borrar?.nombre}?`}
        confirmLabel="Sí, borrar"
        busy={busy}
        onConfirm={async () => {
          setBusy(true)
          await run('borrarGastoFijo', { id: borrar.id }, 'Gasto borrado')
          setBusy(false)
          setBorrar(null)
        }}
        onCancel={() => setBorrar(null)}
      >
        Deja de contar en los gastos del mes. Los pagos que ya cargaste en Caja quedan.
      </Confirm>
    </section>
  )
}

function GastoForm({ gasto, onClose }) {
  const { run, activas } = useApp()
  const [values, setValues] = useState(null)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const v = values ?? gasto
  const set = (field) => (value) => setValues({ ...v, [field]: value })
  const close = () => {
    setValues(null)
    setError(null)
    onClose()
  }
  return (
    <Modal open={Boolean(gasto)} title={gasto?.id ? 'Editar gasto fijo' : 'Nuevo gasto fijo'} onClose={close}>
      {v && (
        <form
          noValidate
          className="space-y-5"
          onSubmit={async (e) => {
            e.preventDefault()
            if (!String(v.nombre).trim()) return setError('Escribí el nombre.')
            setBusy(true)
            const { ok } = await run(
              'guardarGastoFijo',
              { gasto: { ...v, monto: Number(v.monto) || 0, dia_pago: v.dia_pago ? Number(v.dia_pago) : null } },
              'Gasto guardado',
            )
            setBusy(false)
            if (ok) close()
          }}
        >
          <Field id="g-nombre" label="Nombre">
            <input
              id="g-nombre"
              maxLength={80}
              value={v.nombre}
              onChange={(e) => set('nombre')(e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field
            id="g-local"
            label="De qué local"
            hint="General: lo que es del negocio entero y no de un local (monotributo, contador)."
          >
            <select
              id="g-local"
              value={v.sucursal_id ?? ''}
              onChange={(e) => set('sucursal_id')(e.target.value || null)}
              className={selectClass}
            >
              <option value="">General del negocio</option>
              {activas.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.nombre}
                </option>
              ))}
            </select>
          </Field>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field id="g-monto" label="Monto por mes">
              <MoneyInput id="g-monto" value={v.monto} onChange={set('monto')} />
            </Field>
            <Field id="g-dia" label="Día de pago" optional>
              <NumberInput
                id="g-dia"
                value={v.dia_pago ?? ''}
                onChange={(n) => set('dia_pago')(n === '' ? '' : Math.min(n, 31))}
              />
            </Field>
          </div>
          {v.id && <Switch checked={v.activo} onChange={set('activo')} label="Cuenta en los gastos del mes" />}
          <ErrorText>{error}</ErrorText>
          <Button type="submit" busy={busy} className="w-full">
            Guardar
          </Button>
        </form>
      )}
    </Modal>
  )
}

function Patrimonio({ data }) {
  const deuda = data.deudas.reduce((s, d) => s + d.saldo, 0)
  return (
    <section aria-labelledby="patrimonio" className="mt-4">
      <h2 id="patrimonio" className="sr-only">
        Stock y deudas
      </h2>
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat
          label="Mercadería en stock (al costo)"
          value={money(data.stock.costo)}
          hint={`${number(data.stock.unidades)} unidades`}
        />
        <Stat label="Esa mercadería a precio de venta" value={money(data.stock.venta)} />
        <Stat
          label="Deudas con proveedores"
          value={money(deuda)}
          tone={deuda > 0 ? 'danger' : 'default'}
          hint={data.deudas.length === 1 ? '1 compra con saldo' : `${data.deudas.length} compras con saldo`}
        />
      </div>
    </section>
  )
}
