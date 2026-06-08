import { createClient } from '@supabase/supabase-js'

// Public configuration - safe to expose in frontend
const SUPABASE_URL = 'https://cuynuqycsiexwfcwshys.supabase.co'
// Anon key - public, read-only by default, controlled by RLS policies
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? SUPABASE_URL
const supabaseAnonKey = SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Server-side admin client (only used in API routes, never in browser)
export const getSupabaseAdmin = () => createClient(
  supabaseUrl,
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
)
