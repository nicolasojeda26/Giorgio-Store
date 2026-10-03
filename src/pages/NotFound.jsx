import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <section className="grid min-h-svh place-items-center bg-ink px-5 pt-[4.5rem] text-center">
      <div>
        <p className="eyebrow text-gold">Error 404</p>
        <h1 className="mt-5 text-[clamp(2.75rem,8vw,5rem)]">Esta página no existe.</h1>
        <Link to="/" className="btn btn-gold mt-10">
          Volver al inicio
        </Link>
      </div>
    </section>
  )
}
