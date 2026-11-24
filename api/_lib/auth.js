// Usuarios del sistema: contraseñas con scrypt y sesiones en cookie HttpOnly.
// En la base solo queda el hash de la contraseña y el hash del token de cada sesión.
import { createHash, randomBytes, scrypt as scryptCb, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'

const scrypt = promisify(scryptCb)
const N = 16384
const KEY_LENGTH = 64

export const COOKIE = 'giorgio_sistema'
export const SESSION_DAYS = 30
export const MIN_PASSWORD = 8

export async function hashPassword(password) {
  const salt = randomBytes(16)
  const key = await scrypt(password.normalize('NFKC'), salt, KEY_LENGTH, { N, r: 8, p: 1 })
  return `scrypt$${N}$${salt.toString('base64')}$${key.toString('base64')}`
}

export async function verifyPassword(password, stored) {
  const [kind, n, salt, hash] = String(stored ?? '').split('$')
  if (kind !== 'scrypt' || !salt || !hash) return false
  const expected = Buffer.from(hash, 'base64')
  const key = await scrypt(password.normalize('NFKC'), Buffer.from(salt, 'base64'), expected.length, {
    N: Number(n),
    r: 8,
    p: 1,
  })
  return timingSafeEqual(key, expected)
}

/** Para comparar contra un hash de mentira cuando el email no existe (mismo tiempo de respuesta). */
export const DUMMY_HASH = 'scrypt$16384$AAAAAAAAAAAAAAAAAAAAAA==$' + Buffer.alloc(KEY_LENGTH).toString('base64')

export const hashToken = (token) => createHash('sha256').update(token).digest('hex')
export const newToken = () => randomBytes(32).toString('base64url')

/** Compara dos textos sin filtrar por tiempo cuánto coinciden. */
export function safeEqual(a, b) {
  const x = createHash('sha256').update(String(a)).digest()
  const y = createHash('sha256').update(String(b)).digest()
  return timingSafeEqual(x, y)
}

export function readCookie(request, name = COOKIE) {
  const header = request.headers.get('cookie') ?? ''
  for (const part of header.split(';')) {
    const [key, ...rest] = part.trim().split('=')
    if (key === name) return decodeURIComponent(rest.join('='))
  }
  return null
}

export function sessionCookie(request, token) {
  const secure = new URL(request.url).protocol === 'https:' ? '; Secure' : ''
  const maxAge = token ? SESSION_DAYS * 24 * 60 * 60 : 0
  return `${COOKIE}=${token ?? ''}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`
}

export const normalizeEmail = (email) =>
  String(email ?? '')
    .trim()
    .toLowerCase()
