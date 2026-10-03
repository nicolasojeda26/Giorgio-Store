// POST /api/mp-webhook: aviso de Mercado Pago cuando cambia el estado de un pago.
import { getDeps } from './_lib/deps.js'
import { handleWebhook } from './_lib/handlers.js'

export const POST = (request) => handleWebhook(request, getDeps())
