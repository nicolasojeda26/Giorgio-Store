// Piezas de interfaz del sistema: encabezados, campos, interruptores, avisos y confirmaciones.
import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, CircleAlert, LoaderCircle, X } from 'lucide-react'

export const inputClass =
  'h-12 w-full rounded-[3px] border border-ink/30 bg-white/70 px-3.5 text-base text-ink transition-colors duration-150 focus:border-ink focus:outline-2 focus:outline-offset-0 focus:outline-gold aria-[invalid=true]:border-danger'

export const cardClass = 'rounded-md border border-line bg-white/55'

export function PageHeader({ title, back, action, children }) {
  return (
    <header className="mb-6">
      {back && (
        <Link
          to={back}
          className="mb-2 inline-flex min-h-11 items-center gap-2 text-[0.8125rem] font-semibold uppercase tracking-[0.12em] text-mute-ink hover:text-ink"
        >
          <ArrowLeft size={16} strokeWidth={2} />
          Volver
        </Link>
      )}
      <div className="flex items-end justify-between gap-4">
        <h1 className="text-[2.25rem] md:text-[2.75rem]">{title}</h1>
        {action}
      </div>
      {children}
    </header>
  )
}

export function Field({ id, label, hint, error, optional, children }) {
  return (
    <div>
      <label htmlFor={id} className="flex items-baseline justify-between text-[0.9375rem] font-semibold">
        {label}
        {optional && <span className="text-sm font-normal text-mute-ink">Opcional</span>}
      </label>
      <div className="mt-2">{children}</div>
      {error ? (
        <p id={`${id}-error`} className="mt-2 flex gap-2 text-sm text-danger">
          <CircleAlert size={16} strokeWidth={2} className="mt-0.5 shrink-0" />
          {error}
        </p>
      ) : (
        hint && <p className="mt-2 text-sm text-mute-ink">{hint}</p>
      )}
    </div>
  )
}

/** Interruptor accesible (role="switch"). */
export function Switch({ checked, onChange, label, disabled, compact = false }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={compact ? label : undefined}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`group inline-flex min-h-11 items-center gap-3 text-left disabled:opacity-50 ${compact ? '' : 'w-full justify-between'}`}
    >
      {!compact && <span className="text-[0.9375rem] font-semibold">{label}</span>}
      <span
        className={`relative h-7 w-12 shrink-0 rounded-full transition-colors duration-200 ${checked ? 'bg-ink' : 'bg-ink/25'}`}
      >
        <span
          className={`absolute left-0.5 top-0.5 size-6 rounded-full bg-paper shadow-sm transition-transform duration-200 ease-out-quint ${
            checked ? 'translate-x-5' : ''
          }`}
        />
      </span>
    </button>
  )
}

export function Button({ variant = 'primary', busy, children, className = '', ...rest }) {
  const variants = {
    primary: 'bg-ink text-paper hover:bg-ink-2',
    gold: 'bg-gold text-ink hover:bg-gold-bright',
    secondary: 'border border-ink/30 text-ink hover:border-ink',
    danger: 'border border-danger/50 text-danger hover:bg-danger hover:text-paper',
  }
  return (
    <button
      type="button"
      disabled={busy || rest.disabled}
      className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-[3px] px-5 text-[0.8125rem] font-bold uppercase tracking-[0.1em] transition-[background-color,border-color,color,transform] duration-150 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-60 ${variants[variant]} ${className}`}
      {...rest}
    >
      {busy && <LoaderCircle size={16} strokeWidth={2.2} className="animate-spin" />}
      {children}
    </button>
  )
}

export function Chips({ options, value, onChange, label }) {
  return (
    <div role="group" aria-label={label} className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 lg:mx-0 lg:px-0">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
          className={`inline-flex h-11 shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-semibold transition-colors duration-150 ${
            value === option.value ? 'border-ink bg-ink text-paper' : 'border-ink/25 text-ink hover:border-ink'
          }`}
        >
          {option.label}
          {option.count !== undefined && (
            <span className={`text-xs tabular-nums ${value === option.value ? 'text-paper/75' : 'text-mute-ink'}`}>
              {option.count}
            </span>
          )}
        </button>
      ))}
    </div>
  )
}

export function Empty({ title, children }) {
  return (
    <div className="rounded-md border border-dashed border-ink/25 px-6 py-14 text-center">
      <p className="font-display text-[1.5rem]">{title}</p>
      {children && <div className="mt-2 text-mute-ink">{children}</div>}
    </div>
  )
}

/** Confirmación para acciones que no se pueden deshacer. */
export function Confirm({ open, title, children, confirmLabel, busy, onConfirm, onCancel }) {
  const ref = useRef(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog || !open) return
    dialog.showModal()
    return () => dialog.close()
  }, [open])

  if (!open) return null
  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault()
        onCancel()
      }}
      aria-labelledby="confirm-title"
      className="perfume-dialog m-auto w-[min(26rem,calc(100vw-2.5rem))] rounded-md border border-line bg-paper p-6 text-ink backdrop:bg-ink/70"
    >
      <h2 id="confirm-title" className="font-display text-[1.75rem] leading-tight">
        {title}
      </h2>
      <div className="mt-3 text-mute-ink">{children}</div>
      <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={onCancel}>
          No, volver
        </Button>
        <Button variant="danger" busy={busy} onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </div>
    </dialog>
  )
}

/** Barra fija con Guardar / Cancelar al pie de los formularios. */
export function SaveBar({ saving, cancelTo, label = 'Guardar' }) {
  return (
    <div className="sticky bottom-0 z-20 -mx-5 mt-10 flex gap-3 border-t border-line bg-paper/95 px-5 py-4 backdrop-blur-md lg:-mx-10 lg:px-10">
      <Link
        to={cancelTo}
        className="inline-flex min-h-12 flex-1 items-center justify-center rounded-[3px] border border-ink/30 px-5 text-[0.8125rem] font-bold uppercase tracking-[0.1em] hover:border-ink sm:flex-none"
      >
        Cancelar
      </Link>
      <Button type="submit" busy={saving} className="flex-[2] sm:flex-none sm:px-10">
        {label}
      </Button>
    </div>
  )
}

const money = new Intl.NumberFormat('es-AR')
/** Campo de precio en pesos: se escribe solo con números y muestra el formato al lado. */
export function MoneyInput({ id, value, onChange, invalid }) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-mute-ink">$</span>
      <input
        id={id}
        inputMode="numeric"
        autoComplete="off"
        value={value === '' ? '' : money.format(value)}
        onChange={(e) => {
          const digits = e.target.value.replace(/\D/g, '').slice(0, 9)
          onChange(digits === '' ? '' : Number(digits))
        }}
        aria-invalid={invalid || undefined}
        aria-describedby={invalid ? `${id}-error` : undefined}
        className={`${inputClass} pl-8 tabular-nums`}
      />
    </div>
  )
}

/** Campo de número entero chico (cantidades, stock). */
export function NumberInput({ id, value, onChange, invalid, min = 0, ...rest }) {
  return (
    <input
      id={id}
      inputMode="numeric"
      autoComplete="off"
      value={value}
      onChange={(e) => {
        const digits = e.target.value.replace(/\D/g, '').slice(0, 7)
        onChange(digits === '' ? '' : Math.max(Number(digits), min))
      }}
      aria-invalid={invalid || undefined}
      className={`${inputClass} tabular-nums`}
      {...rest}
    />
  )
}

/** Campo de porcentaje con decimales (6,29). */
export function PercentInput({ id, value, onChange, invalid }) {
  return (
    <div className="relative">
      <input
        id={id}
        inputMode="decimal"
        autoComplete="off"
        value={value}
        onChange={(e) =>
          onChange(
            e.target.value
              .replace(/[^\d.,]/g, '')
              .replace(',', '.')
              .slice(0, 7),
          )
        }
        aria-invalid={invalid || undefined}
        className={`${inputClass} pr-9 tabular-nums`}
      />
      <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-mute-ink">%</span>
    </div>
  )
}

export const selectClass = `${inputClass} appearance-none bg-[length:14px] bg-[right_0.9rem_center] bg-no-repeat pr-10 bg-[url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23333' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")]`

/** Número destacado con etiqueta: para los tableros. */
export function Stat({ label, value, hint, tone = 'default', className = '' }) {
  const tones = {
    default: 'border-line bg-white/55',
    dark: 'border-ink bg-ink text-paper',
    ok: 'border-ok/40 bg-ok/5',
    danger: 'border-danger/40 bg-danger/5',
  }
  return (
    <div className={`rounded-md border p-4 ${tones[tone]} ${className}`}>
      <p className={`text-sm ${tone === 'dark' ? 'text-mute' : 'text-mute-ink'}`}>{label}</p>
      <p className="mt-1 text-[1.625rem] font-semibold leading-tight tabular-nums">{value}</p>
      {hint && <p className={`mt-1 text-sm ${tone === 'dark' ? 'text-mute' : 'text-mute-ink'}`}>{hint}</p>}
    </div>
  )
}

/** Ventana modal con formulario (nativa: <dialog>). */
export function Modal({ open, title, onClose, children, wide = false }) {
  const ref = useRef(null)
  useEffect(() => {
    const dialog = ref.current
    if (!dialog || !open) return
    const previous = document.activeElement
    dialog.showModal()
    return () => {
      dialog.close()
      previous?.focus?.()
    }
  }, [open])
  if (!open) return null
  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
      aria-labelledby="modal-title"
      className={`perfume-dialog m-auto max-h-[calc(100svh-2rem)] ${wide ? 'w-[min(40rem,calc(100vw-1.5rem))]' : 'w-[min(28rem,calc(100vw-1.5rem))]'} overflow-y-auto rounded-md border border-line bg-paper p-5 text-ink backdrop:bg-ink/70 sm:p-6`}
    >
      <div className="flex items-start justify-between gap-4">
        <h2 id="modal-title" className="font-display text-[1.625rem] leading-tight">
          {title}
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
          className="-mr-2 -mt-1 grid size-11 shrink-0 place-items-center rounded-full hover:bg-ink/5"
        >
          <X size={20} strokeWidth={1.8} />
        </button>
      </div>
      <div className="mt-4">{children}</div>
    </dialog>
  )
}

export function ErrorText({ children }) {
  if (!children) return null
  return (
    <p role="alert" className="mt-3 flex gap-2 text-sm text-danger">
      <CircleAlert size={16} strokeWidth={2} className="mt-0.5 shrink-0" />
      {children}
    </p>
  )
}
