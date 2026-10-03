// ¿Hay backend conectado? Depende de las variables de entorno (ver .env.example).
// Sin ellas la web funciona en MODO DE PRUEBA: catálogo de ejemplo y checkout que no cobra.
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? ''
export const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? ''

export const BACKEND_ENABLED = !__DEMO__ && Boolean(SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY)
