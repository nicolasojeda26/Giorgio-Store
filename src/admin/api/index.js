import { BACKEND_ENABLED } from '../../lib/backend.js'
import { getSupabase } from '../../lib/supabase.js'
import { makeDemoApi } from './demo.js'
import { makeSupabaseApi } from './supabase.js'

let api

/** API del panel: Supabase si está conectado; si no, la base de prueba del navegador. */
export async function getAdminApi() {
  api ??= BACKEND_ENABLED ? makeSupabaseApi(await getSupabase()) : makeDemoApi()
  return api
}
