import Reveal from '../components/Reveal.jsx'

const STEPS = [
  {
    title: 'Elegí tu promo',
    text: 'Mirá las promos vigentes y entrá a la que te convenga. Cada una ya tiene su precio final.',
  },
  {
    title: 'Armá tu combo',
    text: 'Dentro de la promo vas a ver todos los perfumes disponibles. Elegí los que quieras y combiná como te guste.',
  },
  {
    title: 'Pagá y recibilo',
    text: 'Completás tus datos, pagás con débito o crédito y te lo llevamos a tu casa. Sin escribirle a nadie.',
  },
]

export default function HowItWorks() {
  return (
    <section id="como-comprar" className="bg-paper py-24 text-ink md:py-36">
      <div className="mx-auto max-w-[90rem] px-5 md:px-10">
        <Reveal className="max-w-3xl">
          <p className="eyebrow text-gold-deep">Cómo comprar</p>
          <h2 className="mt-5 text-[clamp(2.75rem,7vw,5.5rem)]">
            Tres pasos y <em>listo.</em>
          </h2>
        </Reveal>

        <ol className="mt-14 grid md:mt-20 md:grid-cols-3 md:gap-10">
          {STEPS.map((step, i) => (
            <Reveal as="li" key={step.title} delay={i * 60} className="border-t border-ink py-8 md:py-0 md:pt-8">
              <div className="flex items-baseline gap-5 md:block">
                <span aria-hidden="true" className="price block text-[5rem] text-gold-deep md:text-[7.5rem]">
                  {i + 1}
                </span>
                <h3 className="text-[2rem] md:mt-8 md:text-[2.25rem]">{step.title}</h3>
              </div>
              <p className="mt-4 max-w-[22rem] text-lg text-mute-ink">{step.text}</p>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  )
}
