// Lee la configuración del servidor desde las variables de entorno (ver .env.example).
export function getConfig(env = process.env) {
  return {
    supabaseUrl: env.SUPABASE_URL || env.VITE_SUPABASE_URL || '',
    supabaseSecretKey: env.SUPABASE_SECRET_KEY || '',
    mpAccessToken: env.MP_ACCESS_TOKEN || '',
    mpWebhookSecret: env.MP_WEBHOOK_SECRET || '',
    siteUrl: (env.SITE_URL || '').replace(/\/+$/, ''),
    resendApiKey: env.RESEND_API_KEY || '',
    emailFrom: env.EMAIL_FROM || '',
    shopEmail: env.SHOP_EMAIL || '',
  }
}

/** true cuando están las claves mínimas para crear pedidos y cobrar. */
export const isConfigured = (config) => Boolean(config.supabaseUrl && config.supabaseSecretKey && config.mpAccessToken)
