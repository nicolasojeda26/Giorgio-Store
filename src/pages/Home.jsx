import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import Hero from '../sections/Hero.jsx'
import TrustStrip from '../sections/TrustStrip.jsx'
import Promos from '../sections/Promos.jsx'
import HowItWorks from '../sections/HowItWorks.jsx'
import ShippingPayments from '../sections/ShippingPayments.jsx'
import Faq from '../sections/Faq.jsx'
import FinalCta from '../sections/FinalCta.jsx'

export default function Home() {
  const { state } = useLocation()

  // Si venimos de otra página pidiendo una sección (ver useSectionNav), hacemos scroll hasta ahí.
  useEffect(() => {
    if (!state?.scrollTo) return
    const id = requestAnimationFrame(() =>
      document.getElementById(state.scrollTo)?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
    )
    return () => cancelAnimationFrame(id)
  }, [state])

  return (
    <>
      <Hero />
      <TrustStrip />
      <Promos />
      <HowItWorks />
      <ShippingPayments />
      <Faq />
      <FinalCta />
    </>
  )
}
