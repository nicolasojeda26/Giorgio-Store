export const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  })

export const errorJson = (code, message, status = 400, extra = {}) =>
  json({ error: { code, message, ...extra } }, status)

/** Lee el cuerpo como JSON con un tope de tamaño. Devuelve null si no es JSON válido. */
export async function readJson(request, maxBytes = 20_000) {
  try {
    const text = await request.text()
    if (text.length > maxBytes) return null
    const data = JSON.parse(text)
    return data && typeof data === 'object' ? data : null
  } catch {
    return null
  }
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
export const isUuid = (value) => typeof value === 'string' && UUID.test(value)
