// Habla con /api/rpc. La sesión va en una cookie HttpOnly que pone el servidor.
export class ApiError extends Error {
  constructor(code, message) {
    super(message)
    this.code = code
  }
}

const NETWORK = 'No se pudo conectar. Revisá tu conexión y probá de nuevo.'

export async function call(action, payload = {}) {
  let response
  try {
    response = await fetch('/api/rpc', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'content-type': 'application/json', 'x-giorgio-sistema': '1' },
      body: JSON.stringify({ action, ...payload }),
    })
  } catch {
    throw new ApiError('red', NETWORK)
  }
  const data = await response.json().catch(() => null)
  if (!response.ok) {
    if (data?.error?.code === 'sesion') window.dispatchEvent(new Event('giorgio:sesion-vencida'))
    throw new ApiError(data?.error?.code ?? 'error', data?.error?.message ?? NETWORK)
  }
  return data
}

export async function session() {
  let response
  try {
    response = await fetch('/api/rpc', { credentials: 'same-origin' })
  } catch {
    throw new ApiError('red', NETWORK)
  }
  const data = await response.json().catch(() => null)
  if (!response.ok) throw new ApiError(data?.error?.code ?? 'error', data?.error?.message ?? NETWORK)
  return data
}
