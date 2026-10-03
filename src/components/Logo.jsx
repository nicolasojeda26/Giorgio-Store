/**
 * Marca de Giorgio Perfumería compuesta con tipografía.
 * Cuando el cliente envíe el logo oficial (SVG o PNG), se reemplaza acá y cambia en toda la web.
 */
export default function Logo({ className = '', size = 'md' }) {
  const sizes = {
    md: { word: 'text-[1.7rem]', sub: 'text-[0.5rem] tracking-[0.46em]' },
    xl: { word: 'text-[clamp(3.5rem,15vw,11rem)]', sub: 'text-[clamp(0.6rem,1.6vw,1rem)] tracking-[0.6em]' },
  }[size]

  return (
    <span className={`inline-flex flex-col items-center leading-none ${className}`}>
      <span className={`font-display uppercase tracking-[0.01em] ${sizes.word}`}>Giorgio</span>
      <span className={`mt-[0.35em] pl-[0.46em] font-sans font-medium uppercase ${sizes.sub}`}>Perfumería</span>
    </span>
  )
}
