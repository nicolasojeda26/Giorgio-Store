import { useState } from 'react'
import { LogOut } from 'lucide-react'
import { useAdmin } from '../store.jsx'
import { Button, Confirm, Field, MoneyInput, PageHeader, cardClass, inputClass } from '../ui.jsx'

export default function SettingsPage() {
  const { data, demo, session, api, run, signOut } = useAdmin()
  const [values, setValues] = useState(data.settings)
  const [saving, setSaving] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const set = (field) => (value) => setValues((prev) => ({ ...prev, [field]: value }))
  const errors = {
    shipping_zone: values.shipping_zone.trim().length < 2 ? 'Escribí la zona de envío.' : undefined,
    shipping_cost: values.shipping_cost === '' ? 'Escribí el costo. Si es gratis, poné 0.' : undefined,
    shipping_eta: values.shipping_eta.trim().length < 2 ? 'Escribí la demora, por ejemplo 24 a 48 h.' : undefined,
  }
  const errorOf = (field) => (submitted ? errors[field] : undefined)

  async function onSubmit(event) {
    event.preventDefault()
    setSubmitted(true)
    const firstInvalid = Object.keys(errors).find((field) => errors[field])
    if (firstInvalid) return document.getElementById(firstInvalid)?.focus()
    setSaving(true)
    await run(
      (api_) =>
        api_.saveSettings({
          shipping_zone: values.shipping_zone.trim(),
          shipping_cost: values.shipping_cost,
          shipping_eta: values.shipping_eta.trim(),
        }),
      'Ajustes guardados',
    )
    setSaving(false)
  }

  async function onReset() {
    setSaving(true)
    const { ok } = await run(() => api.reset(), 'Datos de prueba restablecidos')
    if (ok) setValues((await api.load()).settings)
    setSaving(false)
    setResetting(false)
  }

  return (
    <>
      <PageHeader title="Ajustes" />

      <form onSubmit={onSubmit} noValidate className={`${cardClass} space-y-5 p-5`}>
        <h2 className="font-display text-[1.5rem]">Envío a domicilio</h2>
        <Field
          id="shipping_zone"
          label="Zona"
          hint="Se muestra en la tienda y en el checkout."
          error={errorOf('shipping_zone')}
        >
          <input
            id="shipping_zone"
            maxLength={40}
            value={values.shipping_zone}
            onChange={(e) => set('shipping_zone')(e.target.value)}
            aria-invalid={Boolean(errorOf('shipping_zone')) || undefined}
            className={inputClass}
          />
        </Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field id="shipping_cost" label="Costo fijo" hint="Se suma a cada pedido." error={errorOf('shipping_cost')}>
            <MoneyInput
              id="shipping_cost"
              value={values.shipping_cost}
              onChange={set('shipping_cost')}
              invalid={Boolean(errorOf('shipping_cost'))}
            />
          </Field>
          <Field id="shipping_eta" label="Demora" hint="Por ejemplo: 24 a 48 h." error={errorOf('shipping_eta')}>
            <input
              id="shipping_eta"
              maxLength={30}
              value={values.shipping_eta}
              onChange={(e) => set('shipping_eta')(e.target.value)}
              aria-invalid={Boolean(errorOf('shipping_eta')) || undefined}
              className={inputClass}
            />
          </Field>
        </div>
        <Button type="submit" busy={saving} className="w-full sm:w-auto sm:px-10">
          Guardar ajustes
        </Button>
      </form>

      <section className={`${cardClass} mt-4 p-5`}>
        <h2 className="font-display text-[1.5rem]">Sesión</h2>
        <p className="mt-1 text-mute-ink">{session.email}</p>
        <Button variant="secondary" onClick={signOut} className="mt-4">
          <LogOut size={16} strokeWidth={2} />
          Cerrar sesión
        </Button>
      </section>

      {demo && (
        <section className={`${cardClass} mt-4 p-5`}>
          <h2 className="font-display text-[1.5rem]">Datos de prueba</h2>
          <p className="mt-1 text-mute-ink">Vuelve las promos, los perfumes y los pedidos al ejemplo inicial.</p>
          <Button variant="danger" onClick={() => setResetting(true)} className="mt-4">
            Restablecer datos de prueba
          </Button>
        </section>
      )}

      <Confirm
        open={resetting}
        title="¿Restablecer los datos de prueba?"
        confirmLabel="Sí, restablecer"
        busy={saving}
        onConfirm={onReset}
        onCancel={() => setResetting(false)}
      >
        Se pierde todo lo que cambiaste en este navegador.
      </Confirm>
    </>
  )
}
