import { Bottle } from './Bottles.jsx'

/**
 * Imagen de un perfume: su foto si el cliente la cargó en el panel; si no, la ilustración.
 * `fill`: la foto ocupa todo el contenedor (tarjeta, ficha). Sin `fill` es una miniatura.
 */
export default function PerfumeVisual({ perfume, fill = false, className = '' }) {
  if (perfume.image) {
    return (
      <img
        src={perfume.image}
        alt=""
        loading="lazy"
        decoding="async"
        className={
          fill
            ? `absolute inset-0 size-full object-cover ${className}`
            : `aspect-square rounded-[3px] object-cover ${className}`
        }
      />
    )
  }
  return <Bottle {...perfume.bottle} className={`w-auto ${className}`} />
}
