import { Link } from 'react-router-dom'
import { Lightbulb } from 'lucide-react'
import { useApp } from '../lib/app.jsx'
import { money, percent } from '../lib/format.js'
import { calcularPrecio, descuentoMedio, puntoEquilibrio, simularMes } from '../../shared/finanzas.js'
import { PageHeader, cardClass } from '../components/ui.jsx'

/*
 * Guía de uso. Cada rol ve solo lo que puede hacer. Los ejemplos con números se calculan con las mismas
 * funciones que usa el sistema, así que siempre coinciden con lo que muestran las pantallas.
 */

// Ejemplos (los números salen de shared/finanzas.js).
const MP = { comision_pct: 6.29, retencion_pct: 0, aplica_iva: true }
const ejMedio = descuentoMedio(30000, MP)
const ejPrecio = calcularPrecio({
  costos: [
    { nombre: 'Perfume', monto: 14000 },
    { nombre: 'Bolsa y moño', monto: 500 },
  ],
  medioPago: 6.29,
  ivaComision: 21,
  ganancia: { modo: 'porcentaje', valor: 100 },
  redondeo: 500,
})
const ejEquilibrio = puntoEquilibrio({ fijos: 900000, margenContribucion: 0.45, gananciaPorUnidad: 13500 })
const ejMes = simularMes({
  productos: [
    { nombre: 'Perfume 100 ml', ganancia: 13500, ventas: 40 },
    { nombre: 'Árabe 50 ml', ganancia: 8000, ventas: 30 },
  ],
  gastosFijos: 600000,
  sueldo: 500000,
})

// rol: quién ve la sección. todos | encargado (encargado y dueño) | dueno
const SECCIONES = [
  { id: 'empezar', titulo: 'Para empezar', rol: 'dueno', Contenido: Empezar },
  { id: 'locales', titulo: 'Locales y usuarios', rol: 'todos', Contenido: Locales },
  { id: 'vender', titulo: 'Registrar una venta', rol: 'todos', Contenido: Vender },
  { id: 'stock', titulo: 'Stock', rol: 'todos', Contenido: Stock },
  { id: 'traspasos', titulo: 'Traspasos entre locales', rol: 'encargado', Contenido: Traspasos },
  { id: 'compras', titulo: 'Compras y deudas', rol: 'dueno', Contenido: Compras },
  { id: 'caja', titulo: 'Caja', rol: 'encargado', Contenido: Caja },
  { id: 'finanzas', titulo: 'Finanzas', rol: 'dueno', Contenido: Finanzas },
  { id: 'calculadoras', titulo: 'Calculadoras', rol: 'dueno', Contenido: Calculadoras },
  { id: 'ajustes', titulo: 'Medios de pago y ajustes', rol: 'dueno', Contenido: Ajustes },
  { id: 'preguntas', titulo: 'Preguntas frecuentes', rol: 'todos', Contenido: Preguntas },
]

export default function Guia() {
  const { dueno, encargado } = useApp()
  const visibles = SECCIONES.filter((s) => s.rol === 'todos' || (s.rol === 'dueno' ? dueno : encargado))

  return (
    <>
      <PageHeader title="Guía">
        <p className="mt-2 max-w-prose text-mute-ink">
          Cómo se usa el sistema, paso a paso.{' '}
          {dueno ? 'Como dueño ves todo.' : 'Acá está lo que podés hacer con tu usuario.'}
        </p>
      </PageHeader>

      <nav aria-label="Temas de la guía" className={`${cardClass} p-5`}>
        <p className="eyebrow text-gold-deep">Temas</p>
        <ol className="mt-3 grid gap-x-6 gap-y-1 sm:grid-cols-2">
          {visibles.map((s, n) => (
            <li key={s.id}>
              <a
                href={`#${s.id}`}
                className="flex min-h-11 items-center gap-3 font-semibold underline-offset-4 hover:underline"
              >
                <span className="w-6 text-right tabular-nums text-mute-ink">{n + 1}.</span>
                {s.titulo}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      {visibles.map(({ id, titulo, Contenido }, n) => (
        <section
          key={id}
          id={id}
          aria-labelledby={`${id}-t`}
          className={`${cardClass} guia mt-4 scroll-mt-20 p-5 md:p-7 lg:scroll-mt-8`}
        >
          <h2 id={`${id}-t`} className="font-display text-[1.75rem] leading-tight">
            <span className="mr-2 text-gold-deep">{n + 1}.</span>
            {titulo}
          </h2>
          <div className="mt-3 max-w-prose space-y-3 text-[1rem] leading-relaxed">
            <Contenido />
          </div>
          <p className="mt-5">
            <a href="#contenido" className="text-sm font-semibold text-mute-ink underline underline-offset-4">
              Volver arriba
            </a>
          </p>
        </section>
      ))}
    </>
  )
}

// ---------- Piezas ----------

function Pasos({ children }) {
  return <ol className="list-decimal space-y-2 pl-6 marker:font-semibold marker:text-gold-deep">{children}</ol>
}

function Tip({ children }) {
  return (
    <p className="flex gap-3 rounded-md bg-paper-2 p-4 text-[0.9375rem]">
      <Lightbulb size={18} strokeWidth={1.8} className="mt-0.5 shrink-0 text-gold-deep" aria-hidden="true" />
      <span>{children}</span>
    </p>
  )
}

/** Cuenta de ejemplo: filas con etiqueta y monto, y una fila final destacada. */
function Cuenta({ filas, total, label }) {
  return (
    <dl className="rounded-md border border-line p-4 text-[0.9375rem]" aria-label={label}>
      {filas.map(([k, v]) => (
        <div key={k} className="flex justify-between gap-4 py-1">
          <dt className="text-mute-ink">{k}</dt>
          <dd className="tabular-nums">{v}</dd>
        </div>
      ))}
      <div className="mt-1 flex justify-between gap-4 border-t border-line pt-2 font-semibold">
        <dt>{total[0]}</dt>
        <dd className="tabular-nums">{total[1]}</dd>
      </div>
    </dl>
  )
}

const Ir = ({ to, children }) => (
  <Link to={to} className="font-semibold underline underline-offset-4">
    {children}
  </Link>
)

// ---------- Secciones ----------

function Empezar() {
  return (
    <>
      <p>Antes de cargar ventas, dejá el sistema configurado. Se hace una sola vez:</p>
      <Pasos>
        <li>
          En <Ir to="/ajustes">Ajustes</Ir>, poné el nombre y la dirección de cada local, y tu sueldo por mes (lo que
          querés llevarte: cuenta como un gasto más para el punto de equilibrio).
        </li>
        <li>
          En Ajustes &gt; Medios de pago, revisá la comisión de cada uno (Mercado Pago, débito, crédito). Mirá la
          liquidación del banco o de Mercado Pago para tener el porcentaje real.
        </li>
        <li>
          En <Ir to="/finanzas">Finanzas</Ir> &gt; Gastos fijos, completá los montos: alquiler, servicios y sueldos de
          cada local, y los generales (monotributo, contador). Los que quedan en $0 no cuentan.
        </li>
        <li>
          Cargá los productos en <Ir to="/productos">Stock</Ir> con su costo, su precio y cuántos hay en cada local.
        </li>
        <li>Creá los usuarios de los empleados en Ajustes &gt; Usuarios, cada uno con su local.</li>
      </Pasos>
      <Tip>
        Si los saldos de caja no arrancan en cero (ya tenés plata en el cajón o en el banco), cargá un &quot;Aporte del
        dueño&quot; en Caja por ese monto, en cada cuenta.
      </Tip>
    </>
  )
}

function Locales() {
  const { dueno } = useApp()
  return (
    <>
      <p>
        Los dos locales comparten los mismos productos y precios. Cada uno tiene su propio stock, su caja y sus gastos
        fijos.
      </p>
      {dueno ? (
        <p>
          Arriba (en la barra de la izquierda o, en el celular, arriba a la derecha) elegís con qué local trabajar o
          &quot;Todos los locales&quot; para ver los dos juntos. Todo el sistema se adapta a esa elección y el navegador
          la recuerda.
        </p>
      ) : (
        <p>Tu usuario trabaja siempre en tu local: lo que cargás queda ahí. Su nombre aparece arriba.</p>
      )}
      <p>Hay tres tipos de usuario:</p>
      <ul className="list-disc space-y-1 pl-6">
        <li>
          <strong>Dueño:</strong> ve y hace todo, en los dos locales.
        </li>
        <li>
          <strong>Encargado:</strong> maneja su local: ventas (y anularlas), stock y conteos, traspasos al otro local y
          la caja del local. No ve costos ni finanzas.
        </li>
        <li>
          <strong>Vendedor:</strong> registra ventas e ingresa mercadería en su local. Ve solo sus ventas.
        </li>
      </ul>
      {dueno && (
        <Tip>
          Si cambiás el local o el rol de alguien, o le ponés una contraseña nueva, se le cierra la sesión y tiene que
          volver a entrar. Para que alguien deje de entrar, editalo y apagá &quot;Puede ingresar&quot;.
        </Tip>
      )}
    </>
  )
}

function Vender() {
  const { dueno } = useApp()
  return (
    <>
      <p>Las ventas se cargan a mano: el sistema no cobra ni hace facturas, solo lleva la cuenta.</p>
      <Pasos>
        <li>
          Tocá <Ir to="/ventas/nueva">Registrar venta</Ir>.{dueno && ' Elegí en qué local se vendió.'}
        </li>
        <li>
          Buscá el producto por nombre o código y tocalo (o apretá Enter para el primero). Con + y − cambiás la
          cantidad. El precio se puede cambiar si hiciste un precio especial.
        </li>
        <li>Elegí el medio de pago. Si hubo descuento, ponelo en pesos.</li>
        <li>Guardá. El stock baja solo y el cobro entra en la caja del local.</li>
      </Pasos>
      <p>
        Si no alcanza el stock, el sistema avisa pero deja guardar: el stock queda en negativo hasta que alguien cuente
        o ingrese mercadería. Así nunca se pierde una venta.
      </p>
      {dueno && (
        <>
          <p>
            Mientras cargás la venta ves cuánto te queda: el total menos la comisión del medio de pago y el costo de la
            mercadería. Por ejemplo, una venta de {money(30000)} con Mercado Pago (6,29 % + IVA):
          </p>
          <Cuenta
            label="Ejemplo de comisión"
            filas={[
              ['Comisión 6,29 %', `−${money(ejMedio.comision)}`],
              ['IVA sobre la comisión (21 %)', `−${money(ejMedio.iva)}`],
            ]}
            total={['Entra a la caja', money(30000 - ejMedio.total)]}
          />
        </>
      )}
      <Tip>
        Para corregir una venta mal cargada, anulala en Ventas (dueño o encargado) y cargala de nuevo: los productos
        vuelven al stock y el cobro sale de la caja.
      </Tip>
    </>
  )
}

function Stock() {
  const { encargado, dueno } = useApp()
  return (
    <>
      <p>
        En <Ir to="/productos">Stock</Ir> ves cuánto hay de cada producto en tu local y, abajo, cuánto hay en el otro.
        Los que están en el mínimo o por debajo aparecen como &quot;Reponer&quot; y en el Inicio.
      </p>
      <ul className="list-disc space-y-1 pl-6">
        <li>
          <strong>Ingresar:</strong> cuando llega mercadería sin factura (o la trae el dueño). Escribís cuántas unidades
          entraron y se suman.
        </li>
        {encargado && (
          <li>
            <strong>Contar:</strong> cuando hacés un conteo. Escribís cuántas hay de verdad y el sistema corrige la
            diferencia (rotura, regalo, error). Queda anotado quién y por qué.
          </li>
        )}
        {dueno && (
          <li>
            <strong>Nuevo producto:</strong> con costo, precio, stock inicial de cada local y stock mínimo (el mismo
            para los dos locales). Tocando el nombre de un producto lo editás, lo pausás y ves su historial de
            movimientos.
          </li>
        )}
      </ul>
      {dueno && (
        <Tip>
          Si compraste con factura y precio, cargalo en Compras en vez de &quot;Ingresar&quot;: así se actualiza el
          costo y queda la deuda con el proveedor.
        </Tip>
      )}
    </>
  )
}

function Traspasos() {
  const { dueno } = useApp()
  return (
    <>
      <p>Sirven para mandar mercadería de un local al otro. Sale del stock de uno y entra en el otro en el momento.</p>
      <Pasos>
        <li>
          En <Ir to="/traspasos">Traspasos</Ir>, tocá Nuevo traspaso.
        </li>
        <li>
          {dueno
            ? 'Elegí de qué local sale y a cuál llega.'
            : 'Sale de tu local; elegí a cuál llega (si hay más de uno).'}
        </li>
        <li>Agregá los productos y la cantidad. No deja mandar más de lo que hay.</li>
        <li>Guardá. Queda la lista con fecha y quién lo cargó.</li>
      </Pasos>
      {dueno && <p>Si un traspaso se cargó mal, anulalo: la mercadería vuelve al local de origen.</p>}
    </>
  )
}

function Compras() {
  return (
    <>
      <p>
        Las compras a proveedores suman stock, actualizan el costo de los productos y llevan la cuenta de lo que debés.
      </p>
      <Pasos>
        <li>
          En <Ir to="/compras/nueva">Compras &gt; Nueva compra</Ir>, elegí a qué local llega y el proveedor (los
          proveedores se crean en la pestaña Proveedores).
        </li>
        <li>Agregá los productos con la cantidad y el costo por unidad que dice la factura.</li>
        <li>
          Si pagaste algo en el momento, ponelo en &quot;Pagado ahora&quot; y de qué cuenta salió. Lo que falta queda
          como deuda, con fecha de vencimiento.
        </li>
      </Pasos>
      <p>
        En la pestaña Deudas ves lo que debés y lo que está vencido. &quot;Registrar pago&quot; descuenta de la deuda y
        saca la plata de la caja del local que elijas. Se puede pagar en partes.
      </p>
      <Tip>
        Comprar mercadería no es un gasto en Finanzas: se vuelve costo recién cuando vendés ese producto. Por eso una
        compra grande no te hace &quot;perder&quot; el mes.
      </Tip>
    </>
  )
}

function Caja() {
  const { dueno } = useApp()
  return (
    <>
      <p>
        <Ir to="/caja">Caja</Ir> es la plata real: cuánto hay en efectivo, en el banco y en Mercado Pago, en cada local.
        Las ventas y los pagos a proveedores se anotan solos.
      </p>
      <p>A mano se cargan los otros movimientos:</p>
      <ul className="list-disc space-y-1 pl-6">
        <li>
          <strong>Gasto fijo:</strong> cuando pagás el alquiler, la luz o un sueldo. Arriba aparecen los gastos fijos
          que todavía no se pagaron este mes, con un botón Pagar.
        </li>
        <li>
          <strong>Gasto variable:</strong> lo que cambia según el mes (bolsas, limpieza, un arreglo).
        </li>
        {dueno && (
          <li>
            <strong>Aporte y retiro:</strong> plata que ponés o sacás vos. No son ganancia ni gasto.
          </li>
        )}
        <li>
          <strong>Otro ingreso u otro egreso:</strong> lo que no entra en nada de lo anterior.
        </li>
      </ul>
      <p>
        Los movimientos cargados a mano se pueden borrar. Los de ventas y compras se deshacen anulando la venta o la
        compra.
      </p>
      {dueno && (
        <Tip>
          Caja y Finanzas no tienen que dar lo mismo: Caja es la plata que se movió y Finanzas es lo que se ganó. Si
          pagás el alquiler el día 5, la caja baja ese día, pero en Finanzas el alquiler cuenta para todo el mes.
        </Tip>
      )}
    </>
  )
}

function Finanzas() {
  return (
    <>
      <p>
        <Ir to="/finanzas">Finanzas</Ir> muestra si el mes deja ganancia. Con &quot;Todos los locales&quot; ves el
        negocio completo y la comparación entre locales; eligiendo un local, solo lo de ese local.
      </p>
      <p>Cómo se calcula el resultado del mes:</p>
      <Cuenta
        label="Cómo se calcula el resultado"
        filas={[
          ['Ventas', '+'],
          ['Costo de la mercadería vendida', '−'],
          ['Comisiones de los medios de pago', '−'],
          ['= Margen de contribución', ''],
          ['Gastos fijos (y en el total, los generales)', '−'],
          ['Tu sueldo (solo en el total)', '−'],
          ['Gastos variables y otros egresos', '−'],
        ]}
        total={['Ganancia o pérdida', '=']}
      />
      <p>
        <strong>Margen de contribución:</strong> de cada $100 que vendés, cuánto te queda para pagar los gastos fijos
        después de pagar la mercadería y las comisiones. Si es 45 %, de cada {money(100)} quedan {money(45)}.
      </p>
      <p>
        <strong>Punto de equilibrio:</strong> cuánto hay que vender en el mes para cubrir los gastos fijos y tu sueldo
        (ni ganar ni perder). Es gastos fijos ÷ margen de contribución. Por ejemplo, con {money(900000)} de gastos y un
        margen de {percent(0.45)}:
      </p>
      <Cuenta
        label="Ejemplo de punto de equilibrio"
        filas={[
          ['Gastos fijos + sueldo', money(900000)],
          ['Margen de contribución', percent(0.45)],
          ['Si cada venta deja en promedio', money(13500)],
        ]}
        total={['Hay que vender', `${money(ejEquilibrio.ventas)} (unas ${ejEquilibrio.unidades} ventas)`]}
      />
      <p>
        La barra del Inicio muestra cuánto llevás de ese número. Pasado el equilibrio, todo lo que entra de margen es
        ganancia.
      </p>
      <p>
        <strong>Cada local:</strong> lo que deja cada uno después de su mercadería, comisiones, gastos fijos y
        variables. Sirve para ver si un local tira para arriba y el otro para abajo. Los gastos generales y tu sueldo se
        restan al final, en el resultado del negocio.
      </p>
      <p>
        <strong>Rentabilidad por producto:</strong> cuánto dejó cada producto en el mes, ya descontado su costo, la
        comisión y la parte de los descuentos. Ordenala por ganancia, unidades o margen para ver cuáles conviene empujar
        y cuáles revisar.
      </p>
      <Tip>
        Los gastos fijos se toman como están cargados hoy. Si cambia el alquiler, actualizalo en Finanzas &gt; Gastos
        fijos.
      </Tip>
    </>
  )
}

function Calculadoras() {
  const d = ejPrecio.desglose
  return (
    <>
      <p>
        Las <Ir to="/calculadoras">calculadoras</Ir> sirven para decidir con números. No guardan nada, salvo que toques
        &quot;Usar este precio&quot;.
      </p>

      <h3 className="pt-2 font-display text-[1.375rem]">Precio de venta</h3>
      <p>Te dice a cuánto vender para ganar lo que querés después de pagar todo lo que se lleva cada venta. Cargás:</p>
      <ul className="list-disc space-y-1 pl-6">
        <li>Lo que te cuesta: el producto y lo que le sumás (bolsa, moño, etiqueta).</li>
        <li>
          Lo que te descuentan al cobrar: el medio de pago (con el IVA de la comisión), recargo por cuotas, comisión de
          tienda online y retenciones de IIBB.
        </li>
        <li>El envío si lo pagás vos.</li>
        <li>Cuánto querés ganar: un % sobre el costo o un monto fijo por venta.</li>
      </ul>
      <p>
        Ejemplo: perfume de {money(14000)} + bolsa de {money(500)}, cobrado con Mercado Pago, queriendo ganar el 100 %
        del costo:
      </p>
      <Cuenta
        label="Ejemplo de precio de venta"
        filas={[
          ['Precio sugerido (redondeado a $500)', money(ejPrecio.precio)],
          ['Te cuesta', `−${money(ejPrecio.costo)}`],
          ['Comisión de Mercado Pago', `−${money(d.medioPago)}`],
          ['IVA de la comisión', `−${money(d.iva)}`],
        ]}
        total={['Ganás por venta', money(ejPrecio.ganancia)]}
      />
      <p>
        No alcanza con sumar el 6,29 % al costo: la comisión se cobra sobre el precio final, por eso el sistema calcula
        el precio &quot;de adentro hacia afuera&quot;. Si elegís un producto del stock, abajo te muestra también cuánto
        ganás con el precio que tiene hoy, y si estás perdiendo plata.
      </p>

      <h3 className="pt-2 font-display text-[1.375rem]">¿Me alcanza?</h3>
      <p>
        Estimás cuántas unidades vendés por mes de cada producto y el sistema te dice si eso cubre los gastos fijos y tu
        sueldo. Ejemplo: 40 perfumes que dejan {money(13500)} y 30 árabes que dejan {money(8000)}, con {money(600000)}{' '}
        de gastos y {money(500000)} de sueldo:
      </p>
      <Cuenta
        label="Ejemplo de ¿Me alcanza?"
        filas={[
          ['Ganancia de las ventas', money(ejMes.gananciaTotal)],
          ['Gastos fijos + sueldo', `−${money(ejMes.necesario)}`],
          ['Ventas mínimas para no perder', `${ejMes.ventasMinimas} unidades`],
        ]}
        total={['Resultado del mes', money(ejMes.resultado)]}
      />

      <h3 className="pt-2 font-display text-[1.375rem]">Punto de equilibrio rápido</h3>
      <p>
        Para probar escenarios sin esperar a fin de mes: ponés tus gastos fijos, un precio y un costo promedio, y te
        dice cuánto y cuántas unidades hay que vender para no perder. Es la misma cuenta que la de Finanzas, pero con
        los números que quieras (por ejemplo, &quot;¿y si subo el alquiler?&quot; o &quot;¿y si bajo el precio?&quot;).
      </p>
      <Tip>
        Las calculadoras usan los gastos fijos de todo el negocio y tu sueldo. Podés cambiar esos montos ahí mismo para
        probar.
      </Tip>
    </>
  )
}

function Ajustes() {
  return (
    <>
      <p>
        <strong>Medios de pago:</strong> para cada uno se carga a qué cuenta entra la plata, la comisión, si se cobra
        IVA sobre la comisión y las retenciones. Con eso el sistema calcula cuánto entra de verdad en cada venta. Si
        dejás de aceptar uno, pausalo.
      </p>
      <p>
        <strong>IVA sobre comisiones:</strong> 21 %. <strong>Redondeo:</strong> la calculadora de precios sube el precio
        al múltiplo que pongas (por ejemplo, de a $500).
      </p>
      <p>
        <strong>Locales:</strong> se pueden renombrar y cerrar. Un local cerrado deja de aparecer para vender y mandar
        mercadería, pero su historial queda.
      </p>
    </>
  )
}

function Preguntas() {
  const { dueno } = useApp()
  const items = [
    ['Cargué mal una venta, ¿qué hago?', 'Que el encargado o el dueño la anule y la vuelvas a cargar bien.', true],
    ['El stock no coincide con lo que hay', 'El encargado o el dueño usa "Contar" y pone el número real.', true],
    [
      'No veo el botón para corregir el stock',
      'Contar lo hacen el encargado y el dueño. Vos podés ingresar mercadería.',
      !dueno,
    ],
    ['Me olvidé la contraseña', 'Pedile al dueño que te ponga una nueva desde Ajustes > Usuarios.', !dueno],
    [
      '¿Por qué el resultado da negativo si vendí bastante?',
      'Mirá en Finanzas si las ventas ya pasaron el punto de equilibrio. Hasta ahí, el margen se va en pagar los gastos fijos del mes.',
      dueno,
    ],
    [
      'Los saldos de caja no coinciden con la realidad',
      'Cargá un aporte (si falta plata en el sistema) u otro egreso (si sobra) para igualarlos.',
      dueno,
    ],
    [
      '¿Puedo usarlo desde el celular?',
      'Sí. Desde el navegador del celular; se puede agregar a la pantalla de inicio.',
      true,
    ],
  ].filter(([, , ver]) => ver)
  return (
    <dl className="space-y-4">
      {items.map(([q, a]) => (
        <div key={q}>
          <dt className="font-semibold">{q}</dt>
          <dd className="text-mute-ink">{a}</dd>
        </div>
      ))}
    </dl>
  )
}
