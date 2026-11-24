// /api/rpc: sesión y todas las acciones del sistema.
import { route } from './_lib/deps.js'
import { handleRpc } from './_lib/rpc.js'

export const GET = route(handleRpc)
export const POST = route(handleRpc)
