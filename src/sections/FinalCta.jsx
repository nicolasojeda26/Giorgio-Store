import { ArrowUp } from 'lucide-react'
import Reveal from '../components/Reveal.jsx'
import { useSectionNav } from '../lib/useSectionNav.js'

export default function FinalCta() {
  const goTo = useSectionNav()

  return (
    <section className="grain relative isolate overflow-hidden bg-ink py-28 md:py-44">
      <div
        aria-hidden="true"
        className="absolute left-1/2 top-full -z-10 aspect-square w-[min(120%,70rem)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(closest-side,oklch(0.79_0.125_84/0.32),transparent)]"
      />
      <Reveal className="mx-auto max-w-5xl px-5 text-center md:px-10">
        <h2 className="text-[clamp(2.5rem,7vw,5.5rem)]">
          Tu próximo perfume
          <br />
          está <em className="text-gold-bright">a dos clics.</em>
        </h2>
        <a href="#promos" onClick={goTo('promos')} className="btn btn-gold mt-12">
          Ver promos
          <ArrowUp size={18} strokeWidth={2.2} />
        </a>
      </Reveal>
    </section>
  )
}
