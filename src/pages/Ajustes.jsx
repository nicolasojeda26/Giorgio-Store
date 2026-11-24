import { useState } from 'react'
import { Pencil, Plus } from 'lucide-react'
import { useApp, useData } from '../lib/app.jsx'
import { CUENTAS, decimal } from '../lib/format.js'
import {
  Button,
  Chips,
  ErrorText,
  Field,
  Modal,
  MoneyInput,
  NumberInput,
  PageHeader,
  PercentInput,
  Switch,
  cardClass,
  inputClass,
  selectClass,
} from '../components/ui.jsx'

export default function Ajustes() {
  const { dueno, usuario, logout } = useApp()
  return (
    <>
      <PageHeader title="Ajustes" />
      {dueno && <Negocio />}
      {dueno && <Medios />}
      {dueno && <Usuarios />}
      <Contrasena />
      <section className={`${cardClass} mt-4 p-5`}>
        <h2 className="font-display text-[1.5rem]">Sesión</h2>
        <p className="mt-1 text-mute-ink">
          {usuario.nombre} · {usuario.email}
        </p>
        <Button variant="secondary" onClick={logout} className="mt-4">
          Cerrar sesión
        </Button>
      </section>
    </>
  )
}

function Negocio() {
  const { inicio, run } = useApp()
  const [v, setV] = useState(inicio.ajustes)
  const [busy, setBusy] = useState(false)
  return (
    <form
      noValidate
      className={`${cardClass} space-y-5 p-5`}
      onSubmit={async (e) => {
        e.preventDefault()
        setBusy(true)
        await run(
          'guardarAjustes',
          {
            ajustes: {
              ...v,
              iva_comision: Number(v.iva_comision) || 0,
              redondeo: Number(v.redondeo) || 0,
              sueldo_dueno: Number(v.sueldo_dueno) || 0,
            },
          },
          'Ajustes guardados',
        )
        setBusy(false)
      }}
    >
      <h2 className="font-display text-[1.5rem]">Negocio</h2>
      <Field id="negocio" label="Nombre">
        <input
          id="negocio"
          maxLength={80}
          value={v.negocio}
          onChange={(e) => setV({ ...v, negocio: e.target.value })}
          className={inputClass}
        />
      </Field>
      <div className="grid gap-5 sm:grid-cols-3">
        <Field id="sueldo" label="Tu sueldo por mes" hint="Se suma a los gastos fijos en el punto de equilibrio.">
          <MoneyInput id="sueldo" value={v.sueldo_dueno} onChange={(n) => setV({ ...v, sueldo_dueno: n })} />
        </Field>
        <Field id="iva" label="IVA sobre comisiones" hint="Hoy es 21 %.">
          <PercentInput id="iva" value={v.iva_comision} onChange={(n) => setV({ ...v, iva_comision: n })} />
        </Field>
        <Field id="redondeo" label="Redondear precios a" hint="La calculadora sube al múltiplo de este valor.">
          <NumberInput id="redondeo" value={v.redondeo} onChange={(n) => setV({ ...v, redondeo: n })} />
        </Field>
      </div>
      <Button type="submit" busy={busy}>
        Guardar
      </Button>
    </form>
  )
}

function Medios() {
  const { inicio } = useApp()
  const [editar, setEditar] = useState(null)
  return (
    <section className={`${cardClass} mt-4 p-5`} aria-labelledby="medios">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="medios" className="font-display text-[1.5rem]">
            Medios de pago
          </h2>
          <p className="text-sm text-mute-ink">La comisión se descuenta de cada venta y entra el neto a la cuenta.</p>
        </div>
        <Button
          variant="secondary"
          onClick={() =>
            setEditar({
              nombre: '',
              cuenta: 'banco',
              comision_pct: '',
              retencion_pct: '',
              aplica_iva: true,
              activo: true,
            })
          }
          className="min-h-11 px-4"
        >
          <Plus size={16} strokeWidth={2} aria-hidden="true" />
          Agregar
        </Button>
      </div>
      <ul className="mt-3 divide-y divide-line">
        {inicio.medios.map((m) => (
          <li key={m.id} className={`flex items-center gap-3 py-2.5 ${m.activo ? '' : 'opacity-50'}`}>
            <span className="min-w-0 flex-1">
              <span className="block font-semibold">{m.nombre}</span>
              <span className="text-sm text-mute-ink">
                Entra a {CUENTAS[m.cuenta]} ·{' '}
                {Number(m.comision_pct)
                  ? `${decimal(m.comision_pct)} %${m.aplica_iva ? ' + IVA' : ''}`
                  : 'sin comisión'}
                {Number(m.retencion_pct) > 0 && ` · retención ${decimal(m.retencion_pct)} %`}
              </span>
            </span>
            <button
              type="button"
              onClick={() => setEditar(m)}
              aria-label={`Editar ${m.nombre}`}
              className="grid size-11 place-items-center rounded-full hover:bg-ink/5"
            >
              <Pencil size={16} strokeWidth={1.8} />
            </button>
          </li>
        ))}
      </ul>
      <MedioForm medio={editar} onClose={() => setEditar(null)} />
    </section>
  )
}

function MedioForm({ medio, onClose }) {
  const { run } = useApp()
  const [values, setValues] = useState(null)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const v = values ?? medio
  const set = (f) => (value) => setValues({ ...v, [f]: value })
  const close = () => {
    setValues(null)
    setError(null)
    onClose()
  }
  return (
    <Modal open={Boolean(medio)} title={medio?.id ? 'Editar medio de pago' : 'Nuevo medio de pago'} onClose={close}>
      {v && (
        <form
          noValidate
          className="space-y-5"
          onSubmit={async (e) => {
            e.preventDefault()
            if (!String(v.nombre).trim()) return setError('Escribí el nombre.')
            setBusy(true)
            const { ok } = await run(
              'guardarMedio',
              {
                medio: { ...v, comision_pct: Number(v.comision_pct) || 0, retencion_pct: Number(v.retencion_pct) || 0 },
              },
              'Medio de pago guardado',
            )
            setBusy(false)
            if (ok) close()
          }}
        >
          <Field id="m-nombre" label="Nombre" hint="Por ejemplo: Crédito en 3 cuotas.">
            <input
              id="m-nombre"
              maxLength={60}
              value={v.nombre}
              onChange={(e) => set('nombre')(e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field id="m-cuenta" label="La plata entra a">
            <select
              id="m-cuenta"
              value={v.cuenta}
              onChange={(e) => set('cuenta')(e.target.value)}
              className={selectClass}
            >
              {Object.entries(CUENTAS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </Field>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field id="m-com" label="Comisión">
              <PercentInput id="m-com" value={v.comision_pct} onChange={set('comision_pct')} />
            </Field>
            <Field id="m-ret" label="Retenciones" optional>
              <PercentInput id="m-ret" value={v.retencion_pct} onChange={set('retencion_pct')} />
            </Field>
          </div>
          <Switch checked={v.aplica_iva} onChange={set('aplica_iva')} label="Cobra IVA sobre la comisión" />
          {v.id && <Switch checked={v.activo} onChange={set('activo')} label="Disponible para vender" />}
          <ErrorText>{error}</ErrorText>
          <Button type="submit" busy={busy} className="w-full">
            Guardar
          </Button>
        </form>
      )}
    </Modal>
  )
}

function Usuarios() {
  const { usuario } = useApp()
  const { data } = useData('usuarios')
  const [editar, setEditar] = useState(null)
  return (
    <section className={`${cardClass} mt-4 p-5`} aria-labelledby="usuarios">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="usuarios" className="font-display text-[1.5rem]">
            Usuarios
          </h2>
          <p className="text-sm text-mute-ink">
            Los empleados registran ventas y cargan stock. No ven costos, caja ni finanzas.
          </p>
        </div>
        <Button
          variant="secondary"
          onClick={() => setEditar({ nombre: '', email: '', rol: 'empleado', activo: true, password: '' })}
          className="min-h-11 px-4"
        >
          <Plus size={16} strokeWidth={2} aria-hidden="true" />
          Agregar
        </Button>
      </div>
      <ul className="mt-3 divide-y divide-line">
        {(data ?? []).map((u) => (
          <li key={u.id} className={`flex items-center gap-3 py-2.5 ${u.activo ? '' : 'opacity-50'}`}>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-semibold">
                {u.nombre}
                {u.id === usuario.id && ' (vos)'}
              </span>
              <span className="text-sm text-mute-ink">
                {u.email} · {u.rol === 'dueno' ? 'Dueño' : 'Empleado'}
                {!u.activo && ' · desactivado'}
              </span>
            </span>
            <button
              type="button"
              onClick={() => setEditar({ ...u, password: '' })}
              aria-label={`Editar ${u.nombre}`}
              className="grid size-11 place-items-center rounded-full hover:bg-ink/5"
            >
              <Pencil size={16} strokeWidth={1.8} />
            </button>
          </li>
        ))}
      </ul>
      <UsuarioForm user={editar} onClose={() => setEditar(null)} />
    </section>
  )
}

function UsuarioForm({ user, onClose }) {
  const { run, usuario } = useApp()
  const [values, setValues] = useState(null)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const v = values ?? user
  const set = (f) => (value) => setValues({ ...v, [f]: value })
  const yo = v?.id === usuario.id
  const close = () => {
    setValues(null)
    setError(null)
    onClose()
  }
  return (
    <Modal open={Boolean(user)} title={user?.id ? 'Editar usuario' : 'Nuevo usuario'} onClose={close}>
      {v && (
        <form
          noValidate
          className="space-y-5"
          onSubmit={async (e) => {
            e.preventDefault()
            if (!v.id && String(v.password).length < 8)
              return setError('La contraseña inicial tiene que tener al menos 8 caracteres.')
            setBusy(true)
            const { ok } = await run(
              'guardarUsuario',
              { usuario: { ...v, password: v.password || undefined } },
              'Usuario guardado',
            )
            setBusy(false)
            if (ok) close()
          }}
        >
          <Field id="u-nombre" label="Nombre">
            <input
              id="u-nombre"
              maxLength={60}
              value={v.nombre}
              onChange={(e) => set('nombre')(e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field id="u-email" label="Email" hint="Con este email ingresa al sistema.">
            <input
              id="u-email"
              type="email"
              autoCapitalize="none"
              value={v.email}
              onChange={(e) => set('email')(e.target.value)}
              className={inputClass}
            />
          </Field>
          {!yo && (
            <Chips
              label="Rol"
              value={v.rol}
              onChange={set('rol')}
              options={[
                { value: 'empleado', label: 'Empleado' },
                { value: 'dueno', label: 'Dueño (ve todo)' },
              ]}
            />
          )}
          <Field
            id="u-pass"
            label={v.id ? 'Contraseña nueva' : 'Contraseña inicial'}
            optional={Boolean(v.id)}
            hint={v.id ? 'Solo si se la olvidó: cierra sus sesiones abiertas.' : 'Pasásela y que la cambie en Ajustes.'}
          >
            <input
              id="u-pass"
              type="text"
              autoComplete="new-password"
              value={v.password}
              onChange={(e) => set('password')(e.target.value)}
              className={inputClass}
            />
          </Field>
          {v.id && !yo && <Switch checked={v.activo} onChange={set('activo')} label="Puede ingresar" />}
          <ErrorText>{error}</ErrorText>
          <Button type="submit" busy={busy} className="w-full">
            Guardar
          </Button>
        </form>
      )}
    </Modal>
  )
}

function Contrasena() {
  const { notify, run } = useApp()
  const [v, setV] = useState({ actual: '', nueva: '', repetir: '' })
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const input = (f, label, autoComplete) => (
    <Field id={`pw-${f}`} label={label}>
      <input
        id={`pw-${f}`}
        type="password"
        autoComplete={autoComplete}
        value={v[f]}
        onChange={(e) => setV({ ...v, [f]: e.target.value })}
        className={inputClass}
      />
    </Field>
  )
  return (
    <form
      noValidate
      className={`${cardClass} mt-4 space-y-5 p-5`}
      onSubmit={async (e) => {
        e.preventDefault()
        setError(null)
        if (v.nueva.length < 8) return setError('La contraseña nueva tiene que tener al menos 8 caracteres.')
        if (v.nueva !== v.repetir) return setError('Las dos contraseñas nuevas no coinciden.')
        setBusy(true)
        const { ok, error: err } = await run('cambiarContrasena', { actual: v.actual, nueva: v.nueva })
        setBusy(false)
        if (ok) {
          setV({ actual: '', nueva: '', repetir: '' })
          notify('Contraseña cambiada')
        } else setError(err.message)
      }}
    >
      <h2 className="font-display text-[1.5rem]">Mi contraseña</h2>
      {input('actual', 'Contraseña actual', 'current-password')}
      <div className="grid gap-5 sm:grid-cols-2">
        {input('nueva', 'Nueva', 'new-password')}
        {input('repetir', 'Repetila', 'new-password')}
      </div>
      <ErrorText>{error}</ErrorText>
      <Button type="submit" busy={busy} variant="secondary">
        Cambiar contraseña
      </Button>
    </form>
  )
}
