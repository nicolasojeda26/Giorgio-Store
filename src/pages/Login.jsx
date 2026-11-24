import { useState } from 'react'
import { CircleAlert } from 'lucide-react'
import Logo from '../components/Logo.jsx'
import { useApp } from '../lib/app.jsx'
import { Button, Field, inputClass } from '../components/ui.jsx'

export default function Login() {
  const { login, primerUso, bootError } = useApp()
  const [values, setValues] = useState({ codigo: '', nombre: '', email: '', password: '', repetir: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const set = (field) => (e) => setValues((prev) => ({ ...prev, [field]: e.target.value }))

  async function onSubmit(event) {
    event.preventDefault()
    if (bootError) return window.location.reload()
    if (primerUso && values.password !== values.repetir) return setError('Las dos contraseñas no coinciden.')
    setBusy(true)
    setError(null)
    try {
      if (primerUso) {
        await login('primerUsuario', {
          codigo: values.codigo.trim(),
          nombre: values.nombre.trim(),
          email: values.email.trim(),
          password: values.password,
        })
      } else {
        await login('ingresar', { email: values.email.trim(), password: values.password })
      }
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  const input = (field, label, props = {}, hint) => (
    <Field id={field} label={label} hint={hint}>
      <input id={field} required value={values[field]} onChange={set(field)} className={inputClass} {...props} />
    </Field>
  )

  return (
    <main className="grain relative isolate grid min-h-svh place-items-center overflow-hidden bg-ink px-5 py-10 text-paper">
      <div
        aria-hidden="true"
        className="absolute left-1/2 top-0 -z-10 aspect-square w-[min(140%,48rem)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(closest-side,oklch(0.79_0.125_84/0.25),transparent)]"
      />
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center">
          <Logo />
          <p className="eyebrow mt-4 text-gold">Stock y finanzas</p>
        </div>
        <form onSubmit={onSubmit} className="mt-10 rounded-md bg-paper p-6 text-ink md:p-8">
          <h1 className="text-[2rem]">{primerUso ? 'Crear usuario' : 'Ingresar'}</h1>
          {bootError ? (
            <>
              <p role="alert" className="mt-3 flex gap-2 text-danger">
                <CircleAlert size={18} strokeWidth={2} className="mt-0.5 shrink-0" />
                {bootError}
              </p>
              <Button type="submit" className="mt-6 w-full">
                Reintentar
              </Button>
            </>
          ) : (
            <>
              {primerUso && (
                <p className="mt-3 text-mute-ink">
                  Es el primer ingreso: creá el usuario del dueño. El código de configuración te lo pasa quien armó el
                  sistema.
                </p>
              )}
              <div className="mt-6 space-y-5">
                {primerUso &&
                  input('codigo', 'Código de configuración', { autoComplete: 'one-time-code', spellCheck: false })}
                {primerUso && input('nombre', 'Tu nombre', { autoComplete: 'name' })}
                {input('email', 'Email', {
                  type: 'email',
                  inputMode: 'email',
                  autoComplete: 'username',
                  autoCapitalize: 'none',
                })}
                {input(
                  'password',
                  'Contraseña',
                  { type: 'password', autoComplete: primerUso ? 'new-password' : 'current-password' },
                  primerUso ? 'Al menos 8 caracteres.' : undefined,
                )}
                {primerUso &&
                  input('repetir', 'Repetí la contraseña', { type: 'password', autoComplete: 'new-password' })}
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
                {primerUso ? 'Crear usuario y entrar' : 'Ingresar'}
              </Button>
            </>
          )}
        </form>
      </div>
    </main>
  )
}
