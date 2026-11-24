// /api/rpc: sesión (GET) y todas las acciones del sistema (POST { action, ...datos }).
import { errorJson, json, readJson } from './http.js'
import {
  DUMMY_HASH,
  MIN_PASSWORD,
  SESSION_DAYS,
  hashPassword,
  hashToken,
  newToken,
  normalizeEmail,
  readCookie,
  safeEqual,
  sessionCookie,
  verifyPassword,
} from './auth.js'
import { ACTIONS, ActionError, dbErrorMessage } from './acciones.js'

const LIMITS = { email: 10, ip: 40, minutes: 15 }
const fail = (code, message, status = 400) => errorJson(code, message, status)
const clientIp = (request) => (request.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || 'sin-ip'
const publicUser = (u) => ({
  id: u.id,
  nombre: u.nombre,
  email: u.email,
  rol: u.rol,
  sucursal_id: u.sucursal_id ?? null,
})
const ROLES = ['dueno', 'encargado', 'vendedor']
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Las pantallas siempre mandan este header: un formulario de otro sitio no puede. */
const fromApp = (request) => {
  if (request.headers.get('x-giorgio-sistema') !== '1') return false
  const origin = request.headers.get('origin')
  return !origin || origin === new URL(request.url).origin
}

async function currentUser(request, sql) {
  const token = readCookie(request)
  if (!token) return null
  const [user] = await sql.query(
    `select u.id, u.nombre, u.email, u.rol, u.sucursal_id, u.password_hash from sesiones s join usuarios u on u.id = s.usuario_id
      where s.token_hash = $1 and s.expires_at > now() and u.activo`,
    [hashToken(token)],
  )
  return user ? { ...user, tokenHash: hashToken(token) } : null
}

async function openSession(request, sql, user) {
  const token = newToken()
  await sql.query('insert into sesiones (token_hash, usuario_id, expires_at) values ($1, $2, $3)', [
    hashToken(token),
    user.id,
    new Date(Date.now() + SESSION_DAYS * 86_400_000).toISOString(),
  ])
  return json({ usuario: publicUser(user) }, 200, { 'set-cookie': sessionCookie(request, token) })
}

const recentFailures = async (sql, key) =>
  (
    await sql.query(
      `select count(*)::int as n from intentos_login where key = $1 and created_at > now() - make_interval(mins => $2)`,
      [key, LIMITS.minutes],
    )
  )[0].n
const recordFailure = (sql, keys) => sql.query('insert into intentos_login (key) select unnest($1::text[])', [keys])

const weakPassword = (password) =>
  typeof password !== 'string' || password.length < MIN_PASSWORD || password.length > 200
    ? fail('contrasena', `La contraseña tiene que tener al menos ${MIN_PASSWORD} caracteres.`)
    : null
const validEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)

export async function handleRpc(request, { config, sql }) {
  if (!config.databaseUrl) return fail('sin_configurar', 'Falta conectar la base de datos en Vercel.', 503)

  if (request.method === 'GET') {
    const user = await currentUser(request, sql)
    if (user) return json({ usuario: publicUser(user) })
    const [{ n }] = await sql.query('select count(*)::int as n from usuarios')
    return json({ usuario: null, primerUso: n === 0 })
  }
  if (request.method !== 'POST') return fail('metodo', 'Método no permitido.', 405)
  if (!fromApp(request)) return fail('origen', 'Pedido rechazado.', 403)

  const body = await readJson(request, 200_000)
  if (!body || typeof body.action !== 'string') return fail('pedido_invalido', 'No se pudo leer el pedido.')

  try {
    if (body.action === 'primerUsuario') return await primerUsuario(request, body, { config, sql })
    if (body.action === 'ingresar') return await ingresar(request, body, sql)

    const usuario = await currentUser(request, sql)
    if (!usuario) return fail('sesion', 'Tu sesión terminó. Volvé a ingresar.', 401)

    if (body.action === 'salir') {
      await sql.query('delete from sesiones where token_hash = $1', [usuario.tokenHash])
      return json({ ok: true }, 200, { 'set-cookie': sessionCookie(request, null) })
    }
    if (body.action === 'cambiarContrasena') return await cambiarContrasena(body, usuario, sql)
    if (body.action === 'usuarios' || body.action === 'guardarUsuario') {
      if (usuario.rol !== 'dueno') return fail('sin_permiso', 'Solo el dueño puede hacer esto.', 403)
      return body.action === 'usuarios' ? await listarUsuarios(sql) : await guardarUsuario(body, usuario, sql)
    }

    const action = ACTIONS[body.action]
    if (!action) return fail('accion', 'Acción desconocida.')
    if (action.rol === 'dueno' && usuario.rol !== 'dueno') {
      return fail('sin_permiso', 'Solo el dueño puede hacer esto.', 403)
    }
    if (action.rol === 'encargado' && usuario.rol === 'vendedor') {
      return fail('sin_permiso', 'Esto lo hace el encargado del local o el dueño.', 403)
    }
    return json(await action.run(body, { sql, usuario }))
  } catch (error) {
    if (error instanceof ActionError) return fail(error.code, error.message, error.status)
    const known = dbErrorMessage(error)
    if (known) return fail(known.code, known.message)
    // Datos que la base rechaza (un nombre repetido, un número fuera de rango): error del formulario.
    if (error?.code === '23505') return fail('repetido', 'Ya existe uno con ese nombre o código.')
    if (error?.code && /^(22|23)/.test(String(error.code))) {
      return fail('guardar', 'No se pudo guardar. Revisá los datos.')
    }
    console.error('[rpc]', body.action, error)
    return fail('error_interno', 'Algo falló. Probá de nuevo en unos minutos.', 500)
  }
}

/** Primer usuario (el dueño). Solo mientras no haya ninguno, y con el código de Vercel. */
async function primerUsuario(request, { codigo, nombre, email, password }, { config, sql }) {
  const [{ n }] = await sql.query('select count(*)::int as n from usuarios')
  if (n > 0) return fail('ya_configurado', 'El sistema ya tiene usuario. Ingresá con tu email.')
  if (!config.setupCode) return fail('sin_codigo', 'Falta cargar SETUP_CODE en Vercel.', 503)
  const key = `setup:${clientIp(request)}`
  if ((await recentFailures(sql, key)) >= LIMITS.email)
    return fail('intentos', 'Demasiados intentos. Esperá 15 minutos.', 429)
  if (!safeEqual(String(codigo ?? '').trim(), config.setupCode)) {
    await recordFailure(sql, [key])
    return fail('codigo', 'El código de configuración no es correcto.', 401)
  }
  const cleanEmail = normalizeEmail(email)
  const cleanName = String(nombre ?? '')
    .trim()
    .slice(0, 60)
  if (!cleanName) return fail('nombre', 'Escribí tu nombre.')
  if (!validEmail(cleanEmail)) return fail('email', 'Revisá el email.')
  const weak = weakPassword(password)
  if (weak) return weak
  const [user] = await sql.query(
    "insert into usuarios (nombre, email, password_hash, rol) values ($1, $2, $3, 'dueno') returning id, nombre, email, rol",
    [cleanName, cleanEmail, await hashPassword(password)],
  )
  return openSession(request, sql, user)
}

async function ingresar(request, { email, password }, sql) {
  const cleanEmail = normalizeEmail(email)
  const keys = [`login:${cleanEmail}`, `ip:${clientIp(request)}`]
  const [byEmail, byIp] = await Promise.all(keys.map((key) => recentFailures(sql, key)))
  if (byEmail >= LIMITS.email || byIp >= LIMITS.ip) {
    return fail('intentos', 'Demasiados intentos. Esperá 15 minutos y probá de nuevo.', 429)
  }
  const [user] = await sql.query(
    'select id, nombre, email, rol, sucursal_id, password_hash from usuarios where email = $1 and activo',
    [cleanEmail],
  )
  const ok = await verifyPassword(String(password ?? ''), user?.password_hash ?? DUMMY_HASH)
  if (!user || !ok) {
    await recordFailure(sql, keys)
    return fail('credenciales', 'El email o la contraseña no coinciden.', 401)
  }
  return openSession(request, sql, user)
}

async function cambiarContrasena({ actual, nueva }, usuario, sql) {
  if (!(await verifyPassword(String(actual ?? ''), usuario.password_hash))) {
    return fail('credenciales', 'La contraseña actual no es correcta.', 401)
  }
  const weak = weakPassword(nueva)
  if (weak) return weak
  await sql.query('update usuarios set password_hash = $2 where id = $1', [usuario.id, await hashPassword(nueva)])
  await sql.query('delete from sesiones where usuario_id = $1 and token_hash <> $2', [usuario.id, usuario.tokenHash])
  return json({ ok: true })
}

const listarUsuarios = async (sql) =>
  json(
    await sql.query(
      `select u.id, u.nombre, u.email, u.rol, u.sucursal_id, s.nombre as sucursal, u.activo, u.created_at
         from usuarios u left join sucursales s on s.id = u.sucursal_id
        order by array_position(array['dueno', 'encargado', 'vendedor'], u.rol), s.orden, lower(u.nombre)`,
    ),
  )

/**
 * Alta o cambio de un usuario. Para empleados nuevos (o para darle una contraseña nueva a alguien)
 * el dueño escribe una contraseña inicial y se la pasa; después cada uno la cambia en Ajustes.
 */
async function guardarUsuario({ usuario: u }, yo, sql) {
  const nombre = String(u?.nombre ?? '')
    .trim()
    .slice(0, 60)
  const email = normalizeEmail(u?.email)
  const rol = ROLES.includes(u?.rol) ? u.rol : 'vendedor'
  // Encargados y vendedores trabajan en un local; el dueño, en todos.
  const sucursal = rol === 'dueno' ? null : UUID.test(String(u?.sucursal_id ?? '')) ? u.sucursal_id : null
  if (!nombre) return fail('nombre', 'Escribí el nombre.')
  if (rol !== 'dueno') {
    const [ok] = sucursal ? await sql.query('select id from sucursales where id = $1 and activo', [sucursal]) : []
    if (!ok) return fail('sucursal', 'Elegí el local donde trabaja.')
  }
  if (!validEmail(email)) return fail('email', 'Revisá el email.')
  if (u?.password) {
    const weak = weakPassword(u.password)
    if (weak) return weak
  }

  if (u?.id) {
    if (u.id === yo.id && (rol !== 'dueno' || u.activo === false)) {
      return fail('invalido', 'No podés sacarte el rol de dueño ni desactivarte a vos mismo.')
    }
    const [antes] = await sql.query('select rol, sucursal_id from usuarios where id = $1', [u.id])
    const [row] = await sql.query(
      `update usuarios set nombre = $2, email = $3, rol = $4, activo = $5,
              password_hash = coalesce($6, password_hash), sucursal_id = $7 where id = $1 returning id`,
      [u.id, nombre, email, rol, u.activo !== false, u.password ? await hashPassword(u.password) : null, sucursal],
    )
    if (!row) return fail('no_existe', 'Ese usuario ya no existe.', 404)
    // Si se le cambió la contraseña, el rol o el local, o se lo desactivó, se cierran sus sesiones.
    const cambio = antes && (antes.rol !== rol || antes.sucursal_id !== sucursal)
    if (u.password || u.activo === false || cambio)
      await sql.query('delete from sesiones where usuario_id = $1', [u.id])
    return json(row)
  }
  if (!u?.password) return fail('contrasena', 'Escribí una contraseña inicial para el usuario.')
  const [row] = await sql.query(
    'insert into usuarios (nombre, email, password_hash, rol, sucursal_id) values ($1, $2, $3, $4, $5) returning id',
    [nombre, email, await hashPassword(u.password), rol, sucursal],
  )
  return json(row)
}
