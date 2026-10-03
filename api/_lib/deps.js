// Dependencias reales de las funciones (configuración, Supabase, Mercado Pago, emails).
import { getConfig, isConfigured } from './config.js'
import { getDb } from './db.js'
import { makeMp } from './mercadopago.js'
import { sendOrderEmails } from './email.js'

export function getDeps() {
  const config = getConfig()
  if (!isConfigured(config)) return { config }
  return {
    config,
    db: getDb(config),
    mp: makeMp({ accessToken: config.mpAccessToken }),
    sendEmails: (order) => sendOrderEmails(order, config),
  }
}
