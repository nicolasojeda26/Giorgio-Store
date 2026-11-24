import { Link } from 'react-router-dom'
import { CircleAlert, Plus, TriangleAlert } from 'lucide-react'
import { useApp, useData } from '../lib/app.jsx'
import { day, money, percent, today } from '../lib/format.js'
import { Stat, cardClass } from '../components/ui.jsx'

export default function Inicio() {
  const { usuario, dueno, inicio, sucursal, nombreLocal } = useApp()
  const nombre = usuario.nombre.split(' ')[0]
  // El dueño ve el mes (del local elegido o de los dos); el resto, lo del día y el stock de su local.
  const { data: fin } = useData(dueno ? 'finanzas' : null)
  const todos = dueno && !sucursal
  const ventasHoy = `${inicio.hoy.ventas} ${inicio.hoy.ventas === 1 ? 'venta' : 'ventas'}`

  return (
    <>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="eyebrow text-gold-deep">
            {inicio.ajustes.negocio} · {todos ? 'Todos los locales' : nombreLocal(sucursal)}
          </p>
          <h1 className="mt-1 text-[2.25rem] md:text-[2.75rem]">Hola, {nombre}</h1>
          <Link
            to="/guia"
            className="mt-1 inline-flex min-h-11 items-center text-sm text-mute-ink underline underline-offset-4"
          >
            ¿Dudas? Mirá la guía de uso
          </Link>
        </div>
        <Link to="/ventas/nueva" className="btn btn-gold w-full sm:w-auto">
          <Plus size={18} strokeWidth={2} aria-hidden="true" />
          Registrar venta
        </Link>
      </header>

      <section aria-label="Hoy" className="grid gap-3 sm:grid-cols-2">
        <Stat
          tone="dark"
          label={usuario.rol === 'vendedor' ? 'Vendiste hoy' : 'Vendido hoy'}
          value={money(inicio.hoy.total)}
          hint={ventasHoy}
        />
        {dueno ? (
          <Mes fin={fin} local={!todos} />
        ) : (
          <Stat label="Productos con stock bajo" value={inicio.stockBajo.length} />
        )}
      </section>

      {todos && fin && fin.porLocal.length > 1 && <PorLocal locales={fin.porLocal} />}
      {dueno && fin && <Equilibrio fin={fin} local={!todos} />}

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
              <li key={`${p.id}-${p.sucursal_id}`} className="flex items-center justify-between gap-4 py-2.5">
                <span className="min-w-0">
                  <span className="block truncate font-semibold">{p.nombre}</span>
                  <span className="text-sm text-mute-ink">
                    {[p.presentacion, todos && nombreLocal(p.sucursal_id)].filter(Boolean).join(' · ')}
                  </span>
                </span>
                <span className={`shrink-0 tabular-nums ${p.stock <= 0 ? 'font-bold text-danger' : ''}`}>
                  {p.stock} <span className="text-sm text-mute-ink">/ mín. {p.stock_minimo}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {dueno && fin && <Deudas deudas={fin.deudas} todos={todos} />}
    </>
  )
}

function Mes({ fin, local }) {
  const r = fin?.resumen
  return (
    <Stat
      label={local ? 'Resultado del local en el mes' : 'Resultado del mes'}
      value={r ? money(r.resultado) : '…'}
      tone={r ? (r.resultado >= 0 ? 'ok' : 'danger') : 'default'}
      hint={r ? `Vendido ${money(r.ventas)} · margen ${percent(r.margenContribucion)}` : 'Calculando…'}
    />
  )
}

/** Con "Todos los locales": cómo viene cada uno en el mes. */
function PorLocal({ locales }) {
  return (
    <section aria-labelledby="por-local" className={`${cardClass} mt-4 p-5`}>
      <div className="flex items-baseline justify-between gap-2">
        <h2 id="por-local" className="font-display text-[1.5rem]">
          Locales este mes
        </h2>
        <Link to="/finanzas" className="text-sm font-semibold underline underline-offset-4">
          Comparar
        </Link>
      </div>
      <ul className="mt-3 grid gap-3 sm:grid-cols-2">
        {locales.map((l) => (
          <li key={l.id} className="rounded-md border border-line p-4">
            <p className="font-semibold">{l.nombre}</p>
            <p className="mt-1 text-[1.375rem] font-semibold tabular-nums">{money(l.ventas)}</p>
            <p className="text-sm text-mute-ink">
              {l.cantidad === 1 ? '1 venta' : `${l.cantidad} ventas`} · resultado del local{' '}
              <strong className={l.resultado >= 0 ? 'text-ok' : 'text-danger'}>{money(l.resultado)}</strong>
            </p>
          </li>
        ))}
      </ul>
    </section>
  )
}

function Equilibrio({ fin, local }) {
  const pe = fin.resumen.equilibrio
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
            {local
              ? `Para cubrir los gastos fijos del local (${money(pe.fijos)}) este mes hay que vender `
              : `Para cubrir todos los gastos fijos y tu sueldo (${money(pe.fijos)}) este mes hay que vender `}
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

function Deudas({ deudas, todos }) {
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
                <span className="block truncate font-semibold">
                  {d.proveedor ?? `Compra ${d.numero}`}
                  {todos && <span className="font-normal text-mute-ink"> · {d.sucursal}</span>}
                </span>
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
