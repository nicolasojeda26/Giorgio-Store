// POST /api/checkout: crea el pedido y devuelve el link de pago de Mercado Pago.
import { getDeps } from './_lib/deps.js'
import { handleCheckout } from './_lib/handlers.js'

export const POST = (request) => handleCheckout(request, getDeps())
