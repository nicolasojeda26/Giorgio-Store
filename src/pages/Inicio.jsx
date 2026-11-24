import { Link } from 'react-router-dom'
import { CircleAlert, Plus, TriangleAlert } from 'lucide-react'
import { useApp, useData } from '../lib/app.jsx'
import { day, money, percent, today } from '../lib/format.js'
import { Stat, cardClass } from '../components/ui.jsx'

export default function Inicio() {
  const { usuario, dueno, inicio } = useApp()
  const nombre = usuario.nombre.split(' ')[0]

  return (
    <>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow text-gold-deep">{inicio.ajustes.negocio}</p>
          <h1 className="mt-1 text-[2.25rem] md:text-[2.75rem]">Hola, {nombre}</h1>
        </div>
        <Link to="/ventas/nueva" className="btn btn-gold w-full sm:w-auto">
          <Plus size={18} strokeWidth={2} aria-hidden="true" />
          Registrar venta
        </Link>
      </header>

      <section aria-label="Hoy" className="grid gap-3 sm:grid-cols-2">
        <Stat
          tone="dark"
          label={dueno ? 'Vendido hoy' : 'Vendiste hoy'}
          value={money(inicio.hoy.total)}
          hint={`${inicio.hoy.ventas} ${inicio.hoy.ventas === 1 ? 'venta' : 'ventas'}`}
        />
        {dueno ? <Mes /> : <Stat label="Productos con stock bajo" value={inicio.stockBajo.length} />}
      </section>

      {dueno && <Equilibrio />}

      <section aria-labelledby="bajo" className={`${cardClass} mt-4 p-5`}>
        <div className="flex items-center justify-between gap-4">
          <h2 id="bajo" className="font-display text-[1.5rem]">
            Stock bajo
          </h2>
          <Link to="/productos?filtro=bajo" className="text-sm font-semibold underline underline-offset-4">
            Ver todo
          </Link>
        </div>
        {inicio.stockBajo.length === 0 ? (
          <p className="mt-2 text-mute-ink">Todos los productos están por encima de su stock mínimo.</p>
        ) : (
          <ul className="mt-3 divide-y divide-line">
            {inicio.stockBajo.slice(0, 8).map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-4 py-2.5">
                <span className="min-w-0">
                  <span className="block truncate font-semibold">{p.nombre}</span>
                  {p.presentacion && <span className="text-sm text-mute-ink">{p.presentacion}</span>}
                </span>
                <span className={`shrink-0 tabular-nums ${p.stock <= 0 ? 'font-bold text-danger' : ''}`}>
                  {p.stock} <span className="text-sm text-mute-ink">/ mín. {p.stock_minimo}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {dueno && <Deudas />}
    </>
  )
}

function Mes() {
  const { data } = useData('finanzas')
  const r = data?.resumen
  return (
    <Stat
      label="Resultado del mes"
      value={r ? money(r.resultado) : '…'}
      tone={r ? (r.resultado >= 0 ? 'ok' : 'danger') : 'default'}
      hint={r ? `Vendido ${money(r.ventas)} · margen ${percent(r.margenContribucion)}` : 'Calculando…'}
    />
  )
}

function Equilibrio() {
  const { data } = useData('finanzas')
  if (!data) return null
  const pe = data.resumen.equilibrio
  return (
    <section aria-labelledby="pe" className={`${cardClass} mt-4 p-5`}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="pe" className="font-display text-[1.5rem]">
          Punto de equilibrio
        </h2>
        <Link to="/finanzas" className="text-sm font-semibold underline underline-offset-4">
          Ver finanzas
        </Link>
      </div>
      {!pe.posible ? (
        <p className="mt-2 flex gap-2 text-mute-ink">
          <CircleAlert size={18} strokeWidth={2} className="mt-0.5 shrink-0" />
          Todavía no hay ventas este mes para calcularlo. También podés estimarlo en Calculadoras.
        </p>
      ) : (
        <>
          <p className="mt-2 text-mute-ink">
            Para cubrir los gastos fijos y tu sueldo ({money(pe.fijos)}) este mes hay que vender{' '}
            <strong className="text-ink">{money(pe.ventas)}</strong>
            {pe.unidades ? ` (unas ${pe.unidades} unidades)` : ''}.
          </p>
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
          <p className="mt-2 text-sm text-mute-ink">
            {pe.avance >= 1
              ? 'Ya se cubrieron los gastos del mes: de acá en adelante es ganancia.'
              : `Vas ${percent(pe.avance)}. Faltan ${money(pe.falta)} en ventas.`}
          </p>
        </>
      )}
    </section>
  )
}

function Deudas() {
  const { data } = useData('finanzas')
  const deudas = data?.deudas ?? []
  if (!deudas.length) return null
  const hoy = today()
  return (
    <section aria-labelledby="deudas" className={`${cardClass} mt-4 p-5`}>
      <div className="flex items-center justify-between gap-4">
        <h2 id="deudas" className="font-display text-[1.5rem]">
          Deudas con proveedores
        </h2>
        <Link to="/compras?vista=deudas" className="text-sm font-semibold underline underline-offset-4">
          Pagar
        </Link>
      </div>
      <ul className="mt-3 divide-y divide-line">
        {deudas.slice(0, 5).map((d) => {
          const vencida = d.vencimiento && String(d.vencimiento).slice(0, 10) < hoy
          return (
            <li key={d.id} className="flex items-center justify-between gap-4 py-2.5">
              <span className="min-w-0">
                <span className="block truncate font-semibold">{d.proveedor ?? `Compra ${d.numero}`}</span>
                <span
                  className={`flex items-center gap-1 text-sm ${vencida ? 'font-semibold text-danger' : 'text-mute-ink'}`}
                >
                  {vencida && <TriangleAlert size={14} strokeWidth={2} aria-hidden="true" />}
                  {d.vencimiento ? `${vencida ? 'Venció' : 'Vence'} el ${day(d.vencimiento)}` : 'Sin vencimiento'}
                </span>
              </span>
              <span className="shrink-0 font-semibold tabular-nums">{money(d.saldo)}</span>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
