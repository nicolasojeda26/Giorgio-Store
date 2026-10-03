import { useCatalog } from '../lib/catalog.jsx'

/** Cinta en movimiento con los beneficios. Se duplica el contenido para que el loop sea continuo. */
export default function TrustStrip() {
  const { shipping } = useCatalog()
  const items = [
    `Envíos a domicilio en ${shipping.zone}`,
    'Pagás con débito o crédito',
    'Armás tu combo en un minuto',
    'Compra protegida con Mercado Pago',
    'Sin mensajes ni esperas',
  ]

  const row = (hidden) => (
    <ul aria-hidden={hidden || undefined} className="flex shrink-0 items-center">
      {items.map((text) => (
        <li key={text} className="flex items-center whitespace-nowrap">
          <span className="eyebrow px-7 text-paper/85 md:px-10">{text}</span>
          <span aria-hidden="true" className="size-1.5 rotate-45 bg-gold" />
        </li>
      ))}
    </ul>
  )

  return (
    <div className="overflow-hidden border-y border-ink-3 bg-ink py-5">
      <div className="flex w-max animate-marquee">
        {row(false)}
        {row(true)}
      </div>
    </div>
  )
}
