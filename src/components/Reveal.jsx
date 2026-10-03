import { useReveal } from '../lib/useReveal.js'

/** Envuelve contenido que aparece suavemente al entrar en pantalla. `delay` en ms para escalonar. */
export default function Reveal({ as: Tag = 'div', delay = 0, className = '', style, children, ...rest }) {
  const ref = useReveal()
  return (
    <Tag ref={ref} className={`reveal ${className}`} style={{ '--reveal-delay': `${delay}ms`, ...style }} {...rest}>
      {children}
    </Tag>
  )
}
