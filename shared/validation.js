// Reglas de validación de los datos del comprador.
// Las usa el formulario de checkout (src/) y el servidor (api/), así nunca difieren.

export const LIMITS = { name: 80, phone: 20, email: 120, address: 120, notes: 200 }

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export const digits = (value) => String(value ?? '').replace(/\D/g, '')

/** Recorta espacios y largo máximo de cada campo. */
export function cleanCustomer(input = {}) {
  const text = (key) =>
    String(input[key] ?? '')
      .trim()
      .replace(/\s+/g, ' ')
      .slice(0, LIMITS[key])
  return {
    name: text('name'),
    phone: text('phone'),
    email: text('email').toLowerCase(),
    address: text('address'),
    notes: text('notes'),
  }
}

/** Devuelve { campo: mensaje } con los errores; objeto vacío si está todo bien. */
export function validateCustomer(input) {
  const c = cleanCustomer(input)
  const errors = {}

  if (c.name.length < 3) errors.name = 'Escribí tu nombre y apellido.'
  const phone = digits(c.phone)
  if (phone.length < 8 || phone.length > 13)
    errors.phone = 'Escribí un teléfono con característica, por ejemplo 379 4123456.'
  if (!EMAIL.test(c.email)) errors.email = 'Revisá el email: tiene que ser como nombre@mail.com.'
  if (c.address.length < 5 || !/\d/.test(c.address))
    errors.address = 'Escribí la calle y la altura, por ejemplo Av. 3 de Abril 1234.'

  return errors
}
