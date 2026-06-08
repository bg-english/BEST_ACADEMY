import { createClient } from '@supabase/supabase-js'

// SOLO servidor. Usa la service_role key: nunca debe importarse en componentes cliente.
const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://cuynuqycsiexwfcwshys.supabase.co'
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

export function getAdminClient() {
  if (!SERVICE_ROLE_KEY) {
    throw new Error(
      'Falta SUPABASE_SERVICE_ROLE_KEY en el entorno del servidor (configúrala en .env.local y en Vercel).'
    )
  }
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

// Verifica que el portador del token sea un profesor. Devuelve el user o null.
export async function requireTeacher(accessToken: string | undefined) {
  if (!accessToken) return null
  const admin = getAdminClient()
  const { data, error } = await admin.auth.getUser(accessToken)
  if (error || !data.user) return null
  const { data: teacher } = await admin
    .from('teachers')
    .select('user_id')
    .eq('user_id', data.user.id)
    .maybeSingle()
  return teacher ? data.user : null
}
