/** Error del panel con un mensaje que se le puede mostrar a la persona. */
export class AdminError extends Error {
  constructor(code, message) {
    super(message)
    this.code = code
  }
}

export const ERRORS = {
  credenciales: 'El email o la contraseña no coinciden.',
  sin_permiso: 'Ese usuario no tiene acceso al panel.',
  guardar: 'No se pudo guardar. Revisá tu conexión y probá de nuevo.',
  cargar: 'No se pudieron cargar los datos. Revisá tu conexión y probá de nuevo.',
  foto: 'No se pudo subir la foto. Probá con otra imagen.',
}

export const adminError = (code) => new AdminError(code, ERRORS[code])
