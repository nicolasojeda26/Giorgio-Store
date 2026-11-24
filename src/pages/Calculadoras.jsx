import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { CircleAlert, Minus, Plus, Trash2 } from 'lucide-react'
import { analizarPrecio, calcularPrecio, descuentoMedio, puntoEquilibrio, simularMes } from '../../shared/finanzas.js'
import { useApp, useData } from '../lib/app.jsx'
import { decimal, money, number, percent } from '../lib/format.js'
import {
  Button,
  Chips,
  Field,
  MoneyInput,
  NumberInput,
  PageHeader,
  PercentInput,
  Stat,
  cardClass,
  inputClass,
  selectClass,
} from '../components/ui.jsx'

// Por defecto se calcula con el medio de pago que más descuenta: así el precio no queda corto.
const masCaro = (medios) =>
  [...medios].sort(
    (a, b) => Number(b.comision_pct) + Number(b.retencion_pct) - Number(a.comision_pct) - Number(a.retencion_pct),
  )[0]

const TABS = [
  { value: 'precio', label: 'Precio de venta' },
  { value: 'mes', label: '¿Me alcanza?' },
  { value: 'equilibrio', label: 'Punto de equilibrio' },
]

export default function Calculadoras() {
  const [params, setParams] = useSearchParams()
  const tab = params.get('c') ?? 'precio'
  return (
    <>
      <PageHeader title="Calculadoras">
        <p className="mt-2 max-w-prose text-mute-ink">
          Para decidir precios con números claros. No guardan nada hasta que lo decidas.
        </p>
      </PageHeader>
      <Chips
        label="Calculadora"
        value={tab}
        onChange={(c) => setParams(c === 'precio' ? {} : { c }, { replace: true })}
        options={TABS}
      />
      <div className="mt-4">
        {tab === 'precio' && <Precio />}
        {tab === 'mes' && <Mes />}
        {tab === 'equilibrio' && <EquilibrioRapido />}
      </div>
    </>
  )
}

// ---------- Precio de venta ----------

function Precio() {
  const { inicio, run } = useApp()
  const { data } = useData('productos')
  const medios = inicio.medios.filter((m) => m.activo)
  const [productoId, setProductoId] = useState('')
  const [costos, setCostos] = useState([
    { nombre: 'Producto', monto: '' },
    { nombre: 'Packaging (bolsa, caja, moño)', monto: '' },
  ])
  const [medioId, setMedioId] = useState(masCaro(medios)?.id ?? '')
  const [extra, setExtra] = useState({ plataforma: '', cuotas: '', retenciones: '', envio: '' })
  const [modo, setModo] = useState('porcentaje')
  const [ganancia, setGanancia] = useState(80)
  const [precioActual, setPrecioActual] = useState('')
  const [saving, setSaving] = useState(false)

  const producto = data?.productos.find((p) => p.id === productoId)
  const medio = medios.find((m) => m.id === medioId)
  const iva = Number(inicio.ajustes.iva_comision)
  const params = {
    costos: costos.map((c) => ({ ...c, monto: Number(c.monto) || 0 })),
    plataforma: Number(extra.plataforma) || 0,
    cuotas: Number(extra.cuotas) || 0,
    medioPago: Number(medio?.comision_pct ?? 0),
    // El IVA se aplica solo si el medio lo cobra; las comisiones de plataforma y cuotas también llevan IVA.
    ivaComision: medio?.aplica_iva || Number(extra.plataforma) || Number(extra.cuotas) ? iva : 0,
    retenciones: (Number(extra.retenciones) || 0) + Number(medio?.retencion_pct ?? 0),
    envio: Number(extra.envio) || 0,
    ganancia: { modo, valor: Number(ganancia) || 0 },
    redondeo: Number(inicio.ajustes.redondeo) || 0,
  }
  const r = calcularPrecio(params)
  const actual =
    Number(precioActual) > 0 ? analizarPrecio({ ...params, precio: Number(precioActual), costo: r.costo }) : null

  const elegir = (id) => {
    setProductoId(id)
    const p = data?.productos.find((x) => x.id === id)
    if (p) {
      setCostos((prev) => [{ nombre: 'Producto', monto: p.costo }, ...prev.slice(1)])
      setPrecioActual(p.precio)
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_20rem] lg:items-start">
      <div className="space-y-4">
        <section className={`${cardClass} space-y-5 p-5`} aria-labelledby="costos">
          <h2 id="costos" className="font-display text-[1.375rem]">
            1. Lo que te cuesta
          </h2>
          <Field id="calc-producto" label="Producto del stock" optional hint="Trae su costo y su precio actual.">
            <select
              id="calc-producto"
              value={productoId}
              onChange={(e) => elegir(e.target.value)}
              className={selectClass}
            >
              <option value="">Otro (escribo el costo)</option>
              {(data?.productos ?? [])
                .filter((p) => p.activo)
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre}
                  </option>
                ))}
            </select>
          </Field>
          <ul className="space-y-3">
            {costos.map((c, i) => (
              <li key={i} className="grid grid-cols-[1fr_9rem_auto] items-end gap-2">
                <div>
                  <label htmlFor={`costo-n-${i}`} className="sr-only">
                    Concepto
                  </label>
                  <input
                    id={`costo-n-${i}`}
                    value={c.nombre}
                    onChange={(e) =>
                      setCostos((prev) => prev.map((x, n) => (n === i ? { ...x, nombre: e.target.value } : x)))
                    }
                    className={inputClass}
                  />
                </div>
                <div>
                  <label htmlFor={`costo-m-${i}`} className="sr-only">
                    Monto de {c.nombre}
                  </label>
                  <MoneyInput
                    id={`costo-m-${i}`}
                    value={c.monto}
                    onChange={(v) => setCostos((prev) => prev.map((x, n) => (n === i ? { ...x, monto: v } : x)))}
                  />
                </div>
                <button
                  type="button"
                  disabled={costos.length === 1}
                  onClick={() => setCostos((prev) => prev.filter((_, n) => n !== i))}
                  aria-label={`Quitar ${c.nombre}`}
                  className="grid size-12 place-items-center rounded-full text-mute-ink hover:text-danger disabled:opacity-30"
                >
                  <Trash2 size={17} strokeWidth={1.8} />
                </button>
              </li>
            ))}
          </ul>
          <Button
            variant="secondary"
            onClick={() => setCostos((prev) => [...prev, { nombre: '', monto: '' }])}
            className="min-h-11 px-4"
          >
            <Plus size={16} strokeWidth={2} aria-hidden="true" />
            Agregar otro costo
          </Button>
          <p className="flex justify-between border-t border-line pt-3 font-semibold">
            <span>Total que te cuesta</span>
            <span className="tabular-nums">{money(r.costo)}</span>
          </p>
        </section>

        <section className={`${cardClass} space-y-5 p-5`} aria-labelledby="descuentos">
          <h2 id="descuentos" className="font-display text-[1.375rem]">
            2. Lo que te descuentan por venta
          </h2>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field
              id="calc-medio"
              label="Medio de pago"
              hint={
                medio ? `${decimal(medio.comision_pct)} % de comisión${medio.aplica_iva ? ' + IVA' : ''}` : undefined
              }
            >
              <select
                id="calc-medio"
                value={medioId}
                onChange={(e) => setMedioId(e.target.value)}
                className={selectClass}
              >
                {medios.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nombre}
                  </option>
                ))}
              </select>
            </Field>
            <Field
              id="calc-cuotas"
              label="Recargo por cuotas"
              optional
              hint="Lo que cobra el medio por dar cuotas sin interés."
            >
              <PercentInput id="calc-cuotas" value={extra.cuotas} onChange={(v) => setExtra({ ...extra, cuotas: v })} />
            </Field>
            <Field
              id="calc-plataforma"
              label="Comisión de tienda online"
              optional
              hint="Si vendés por una plataforma (Tiendanube, etc.)."
            >
              <PercentInput
                id="calc-plataforma"
                value={extra.plataforma}
                onChange={(v) => setExtra({ ...extra, plataforma: v })}
              />
            </Field>
            <Field id="calc-ret" label="Retenciones (IIBB)" optional hint="Las que te retienen en cada cobro.">
              <PercentInput
                id="calc-ret"
                value={extra.retenciones}
                onChange={(v) => setExtra({ ...extra, retenciones: v })}
              />
            </Field>
            <Field id="calc-envio" label="Envío a tu cargo" optional hint="Si lo pagás vos, por venta.">
              <MoneyInput id="calc-envio" value={extra.envio} onChange={(v) => setExtra({ ...extra, envio: v })} />
            </Field>
          </div>
        </section>

        <section className={`${cardClass} space-y-5 p-5`} aria-labelledby="ganar">
          <h2 id="ganar" className="font-display text-[1.375rem]">
            3. Cuánto querés ganar por venta
          </h2>
          <Chips
            label="Cómo querés calcular la ganancia"
            value={modo}
            onChange={(m) => {
              setModo(m)
              setGanancia(m === 'porcentaje' ? 80 : '')
            }}
            options={[
              { value: 'porcentaje', label: '% sobre el costo' },
              { value: 'fijo', label: 'Monto fijo' },
            ]}
          />
          {modo === 'porcentaje' ? (
            <Field id="calc-ganancia" label="Ganancia sobre el costo" hint="100 % = ganás lo mismo que te cuesta.">
              <PercentInput id="calc-ganancia" value={ganancia} onChange={setGanancia} />
            </Field>
          ) : (
            <Field id="calc-ganancia" label="Ganancia limpia por venta">
              <MoneyInput id="calc-ganancia" value={ganancia} onChange={setGanancia} />
            </Field>
          )}
        </section>
      </div>

      <aside className="space-y-4 lg:sticky lg:top-10" aria-label="Resultado">
        <div className="rounded-md bg-ink p-5 text-paper">
          {!r.valido ? (
            <p className="flex gap-2 text-danger-bright">
              <CircleAlert size={18} strokeWidth={2} className="mt-0.5 shrink-0" />
              {r.motivo}
            </p>
          ) : (
            <>
              <p className="text-sm text-mute">Precio sugerido</p>
              <p className="price mt-1 text-[3rem] text-gold" aria-live="polite">
                {money(r.precio)}
              </p>
              {r.precio !== r.precioExacto && (
                <p className="text-sm text-mute">Exacto: {money(r.precioExacto)}, redondeado hacia arriba.</p>
              )}
              <Desglose a={r} />
              {producto && r.precio !== producto.precio && (
                <Button
                  busy={saving}
                  onClick={async () => {
                    setSaving(true)
                    await run(
                      'guardarProducto',
                      { producto: { ...producto, precio: r.precio } },
                      `Nuevo precio de ${producto.nombre}: ${money(r.precio)}`,
                    )
                    setPrecioActual(r.precio)
                    setSaving(false)
                  }}
                  variant="gold"
                  className="mt-5 w-full"
                >
                  Usar este precio
                </Button>
              )}
            </>
          )}
        </div>

        <div className={`${cardClass} p-5`}>
          <Field id="calc-actual" label="¿Y con el precio que tenés hoy?">
            <MoneyInput id="calc-actual" value={precioActual} onChange={setPrecioActual} />
          </Field>
          {actual && (
            <div className={`mt-3 rounded-md p-3 ${actual.pierde ? 'bg-danger/10' : 'bg-ok/10'}`}>
              <p className="font-semibold">
                {actual.pierde
                  ? `Perdés ${money(-actual.ganancia)} por venta`
                  : `Ganás ${money(actual.ganancia)} por venta`}
              </p>
              <p className="text-sm text-mute-ink">
                Margen {percent(actual.margen)} · markup {percent(actual.markup)}
              </p>
            </div>
          )}
        </div>
      </aside>
    </div>
  )
}

function Desglose({ a }) {
  const filas = [
    ['Te cuesta', a.costo],
    ['Comisión del medio de pago', a.desglose.medioPago],
    ['Recargo por cuotas', a.desglose.cuotas],
    ['Comisión de tienda online', a.desglose.plataforma],
    ['IVA sobre comisiones', a.desglose.iva],
    ['Retenciones', a.desglose.retenciones],
    ['Envío', a.desglose.envio],
  ].filter(([, v], i) => i === 0 || v > 0)
  return (
    <dl className="mt-4 space-y-1.5 border-t border-ink-3 pt-4 text-sm">
      {filas.map(([label, value]) => (
        <div key={label} className="flex justify-between gap-3">
          <dt className="text-mute">{label}</dt>
          <dd className="tabular-nums">−{money(value)}</dd>
        </div>
      ))}
      <div className="flex justify-between gap-3 border-t border-ink-3 pt-2 font-semibold">
        <dt>Ganancia limpia</dt>
        <dd className={`tabular-nums ${a.pierde ? 'text-danger-bright' : ''}`}>{money(a.ganancia)}</dd>
      </div>
      <div className="flex justify-between gap-3 text-mute">
        <dt>Margen sobre el precio</dt>
        <dd className="tabular-nums">{percent(a.margen)}</dd>
      </div>
      <div className="flex justify-between gap-3 text-mute">
        <dt>Markup sobre el costo</dt>
        <dd className="tabular-nums">{percent(a.markup)}</dd>
      </div>
    </dl>
  )
}

// ---------- ¿Me alcanza? (simulador del mes) ----------

function Mes() {
  const { inicio } = useApp()
  const { data } = useData('productos')
  const gastos = useData('gastosFijos')
  const medios = inicio.medios.filter((m) => m.activo)
  const [medioId, setMedioId] = useState(masCaro(medios)?.id ?? '')
  const [ventas, setVentas] = useState({}) // productoId -> unidades por mes
  const [fijos, setFijos] = useState(null)
  const [sueldo, setSueldo] = useState(inicio.ajustes.sueldo_dueno)
  const medio = medios.find((m) => m.id === medioId)
  const productos = (data?.productos ?? []).filter((p) => p.activo && p.precio > 0)
  const fijosReales = (gastos.data ?? []).filter((g) => g.activo).reduce((s, g) => s + g.monto, 0)
  const gastosFijos = fijos ?? fijosReales

  const ganancia = (p) => p.precio - (p.costo ?? 0) - descuentoMedio(p.precio, medio, inicio.ajustes.iva_comision).total
  const elegidos = productos.filter((p) => Number(ventas[p.id]) > 0)
  const r = simularMes({
    productos: elegidos.map((p) => ({ nombre: p.nombre, ganancia: ganancia(p), ventas: Number(ventas[p.id]) })),
    gastosFijos,
    sueldo: Number(sueldo) || 0,
  })
  const setUnidades = (id, n) => setVentas((prev) => ({ ...prev, [id]: Math.max(0, n) }))

  return (
    <div className="space-y-4">
      <section className={`${cardClass} p-5`}>
        <h2 className="font-display text-[1.375rem]">¿Cuántas ventas estimás por mes de cada producto?</h2>
        <p className="mt-1 text-sm text-mute-ink">
          La ganancia por unidad es precio − costo − lo que descuenta el medio de pago elegido.
        </p>
        <div className="mt-4 max-w-sm">
          <Field id="mes-medio" label="Calcular con el medio de pago">
            <select id="mes-medio" value={medioId} onChange={(e) => setMedioId(e.target.value)} className={selectClass}>
              {medios.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nombre}
                </option>
              ))}
            </select>
          </Field>
        </div>
        {productos.length === 0 ? (
          <p className="mt-4 text-mute-ink">Cargá productos con precio en Stock para usar esta calculadora.</p>
        ) : (
          <ul className="mt-4 divide-y divide-line">
            {productos.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-3 py-2.5">
                <span className="min-w-0 flex-1 basis-48">
                  <span className="block truncate font-semibold">{p.nombre}</span>
                  <span className={`text-sm ${ganancia(p) < 0 ? 'text-danger' : 'text-mute-ink'}`}>
                    {money(ganancia(p))} por venta
                  </span>
                </span>
                <div className="flex items-center gap-1" role="group" aria-label={`Ventas por mes de ${p.nombre}`}>
                  <button
                    type="button"
                    aria-label="Una menos"
                    onClick={() => setUnidades(p.id, (Number(ventas[p.id]) || 0) - 1)}
                    className="grid size-11 place-items-center rounded-full border border-ink/25"
                  >
                    <Minus size={16} strokeWidth={2} />
                  </button>
                  <div className="w-16">
                    <NumberInput
                      aria-label={`Unidades de ${p.nombre}`}
                      value={ventas[p.id] ?? ''}
                      onChange={(n) => setUnidades(p.id, Number(n) || 0)}
                      className={`${inputClass} text-center tabular-nums`}
                    />
                  </div>
                  <button
                    type="button"
                    aria-label="Una más"
                    onClick={() => setUnidades(p.id, (Number(ventas[p.id]) || 0) + 1)}
                    className="grid size-11 place-items-center rounded-full border border-ink/25"
                  >
                    <Plus size={16} strokeWidth={2} />
                  </button>
                </div>
                <span className="w-28 text-right font-semibold tabular-nums">
                  {money(ganancia(p) * (Number(ventas[p.id]) || 0))}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={`${cardClass} grid gap-5 p-5 sm:grid-cols-2`}>
        <Field
          id="mes-fijos"
          label="Gastos fijos del mes"
          hint={`Los de todo el negocio (los dos locales y los generales) suman ${money(fijosReales)}.`}
        >
          <MoneyInput id="mes-fijos" value={gastosFijos} onChange={setFijos} />
        </Field>
        <Field id="mes-sueldo" label="Tu sueldo" hint="Lo que querés llevarte por mes.">
          <MoneyInput id="mes-sueldo" value={sueldo} onChange={setSueldo} />
        </Field>
      </section>

      <section aria-live="polite" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          tone="dark"
          label="Ganancia de las ventas"
          value={money(r.gananciaTotal)}
          hint={`${number(r.unidades)} ventas por mes`}
        />
        <Stat label="Gastos fijos + sueldo" value={money(r.necesario)} />
        <Stat
          label="Ventas mínimas para no perder"
          value={r.ventasMinimas ? number(r.ventasMinimas) : '—'}
          hint={r.ventasMinimas ? 'Con esta mezcla de productos' : 'Cargá ventas estimadas'}
        />
        <Stat
          tone={r.unidades ? (r.resultado >= 0 ? 'ok' : 'danger') : 'default'}
          label="Resultado del mes"
          value={money(r.resultado)}
        />
      </section>
      {r.unidades > 0 && (
        <p className={`rounded-md p-4 font-semibold ${r.rentable ? 'bg-ok/10' : 'bg-danger/10'}`}>
          {r.rentable
            ? `Con ${number(r.unidades)} ventas por mes el negocio es rentable: te quedan ${money(r.resultado)} después de gastos y sueldo.`
            : `Con ${number(r.unidades)} ventas por mes no alcanza: faltan ${money(-r.resultado)}. Necesitás unas ${number(r.ventasMinimas)} ventas o mejorar el margen.`}
        </p>
      )}
    </div>
  )
}

// ---------- Punto de equilibrio rápido ----------

function EquilibrioRapido() {
  const { inicio } = useApp()
  const gastos = useData('gastosFijos')
  const fijosReales =
    (gastos.data ?? []).filter((g) => g.activo).reduce((s, g) => s + g.monto, 0) + Number(inicio.ajustes.sueldo_dueno)
  const [fijos, setFijos] = useState(null)
  const [precio, setPrecio] = useState('')
  const [costo, setCosto] = useState('')
  const [comision, setComision] = useState('')
  const f = fijos ?? fijosReales
  const r = useMemo(() => {
    const p = Number(precio) || 0
    const variable = (Number(costo) || 0) + p * ((Number(comision) || 0) / 100)
    const porUnidad = p - variable
    return {
      porUnidad,
      pe: puntoEquilibrio({ fijos: f, margenContribucion: p > 0 ? porUnidad / p : 0, gananciaPorUnidad: porUnidad }),
    }
  }, [precio, costo, comision, f])

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_20rem] lg:items-start">
      <section className={`${cardClass} grid gap-5 p-5 sm:grid-cols-2`}>
        <div className="sm:col-span-2">
          <h2 className="font-display text-[1.375rem]">¿Cuánto tengo que vender para no perder?</h2>
          <p className="mt-1 text-sm text-mute-ink">
            Con un precio y un costo promedio por venta. Ideal para probar escenarios.
          </p>
        </div>
        <Field
          id="pe-fijos"
          label="Gastos fijos + sueldo por mes"
          hint={`Todo el negocio, con tu sueldo: ${money(fijosReales)}.`}
        >
          <MoneyInput id="pe-fijos" value={f} onChange={setFijos} />
        </Field>
        <Field id="pe-precio" label="Precio promedio por venta">
          <MoneyInput id="pe-precio" value={precio} onChange={setPrecio} />
        </Field>
        <Field id="pe-costo" label="Costo promedio de la mercadería">
          <MoneyInput id="pe-costo" value={costo} onChange={setCosto} />
        </Field>
        <Field id="pe-comision" label="Comisiones e impuestos por venta" optional hint="Promedio, en % del precio.">
          <PercentInput id="pe-comision" value={comision} onChange={setComision} />
        </Field>
      </section>
      <aside className="rounded-md bg-ink p-5 text-paper" aria-live="polite" aria-label="Resultado">
        {!r.pe.posible ? (
          <p className="text-mute">
            Completá precio y costo: el precio tiene que ser mayor que lo que cuesta cada venta.
          </p>
        ) : (
          <>
            <p className="text-sm text-mute">Hay que vender por mes</p>
            <p className="price mt-1 text-[2.75rem] text-gold">{money(r.pe.ventas)}</p>
            <p className="mt-2">
              o unas {number(r.pe.unidades)} ventas (≈ {number(Math.ceil(r.pe.unidades / 26))} por día hábil).
            </p>
            <p className="mt-3 text-sm text-mute">
              Cada venta deja {money(r.porUnidad)} ({percent(r.porUnidad / Number(precio))} del precio) para cubrir
              gastos.
            </p>
          </>
        )}
      </aside>
    </div>
  )
}
