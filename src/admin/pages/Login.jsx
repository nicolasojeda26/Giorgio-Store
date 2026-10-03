import { useState } from 'react'
import { CircleAlert } from 'lucide-react'
import Logo from '../../components/Logo.jsx'
import { useAdmin } from '../store.jsx'
import { Button, Field, inputClass } from '../ui.jsx'

export default function Login() {
  const { demo, signIn } = useAdmin()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  async function onSubmit(event) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await signIn(email.trim(), password)
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  return (
    <main className="grain relative isolate grid min-h-svh place-items-center overflow-hidden bg-ink px-5 py-10 text-paper">
      <div
        aria-hidden="true"
        className="absolute left-1/2 top-0 -z-10 aspect-square w-[min(140%,48rem)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(closest-side,oklch(0.79_0.125_84/0.25),transparent)]"
      />
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center">
          <Logo />
          <p className="eyebrow mt-4 text-gold">Panel de administración</p>
        </div>

        <form onSubmit={onSubmit} className="mt-10 rounded-md bg-paper p-6 text-ink md:p-8">
          <h1 className="text-[2rem]">Ingresar</h1>

          {demo ? (
            <>
              <p className="mt-3 text-mute-ink">
                La web está en modo de prueba. Podés entrar sin usuario: lo que cambies se guarda solo en este
                navegador.
              </p>
              <Button type="submit" busy={busy} className="mt-6 w-full">
                Entrar al panel de prueba
              </Button>
            </>
          ) : (
            <>
              <div className="mt-6 space-y-5">
                <Field id="email" label="Email">
                  <input
                    id="email"
                    type="email"
                    inputMode="email"
                    autoComplete="username"
                    autoCapitalize="none"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={inputClass}
                  />
                </Field>
                <Field id="password" label="Contraseña">
                  <input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={inputClass}
                  />
                </Field>
              </div>
              <div role="alert">
                {error && (
                  <p className="mt-5 flex gap-2 text-sm text-danger">
                    <CircleAlert size={16} strokeWidth={2} className="mt-0.5 shrink-0" />
                    {error}
                  </p>
                )}
              </div>
              <Button type="submit" busy={busy} className="mt-6 w-full">
                Ingresar
              </Button>
            </>
          )}
        </form>
      </div>
    </main>
  )
}
