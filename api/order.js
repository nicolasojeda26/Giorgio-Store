// GET /api/order?id=...&token=...: estado de un pedido, para la página de confirmación.
import { getDeps } from './_lib/deps.js'
import { handleOrder } from './_lib/handlers.js'

export const GET = (request) => handleOrder(request, getDeps())
