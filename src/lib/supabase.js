import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from './backend.js'

let client

/** Cliente de Supabase para el navegador. Se descarga recién cuando hace falta. */
export async function getSupabase() {
  if (!client) {
    const { createClient } = await import('@supabase/supabase-js')
    client = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY)
  }
  return client
}
