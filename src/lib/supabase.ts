import { createClient } from '@supabase/supabase-js'

// Public Supabase config - anon key is safe to expose (controlled by RLS policies)
const SUPABASE_URL = 'https://cuynuqycsiexwfcwshys.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN1eW51cXljc2lleHdmY3dzaHlzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA4NzExODIsImV4cCI6MjA5NjQ0NzE4Mn0.u_Q-FmHAxhnembbyNu5LX4ZPNDf3z15d1cpSHnaCq8A'

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || SUPABASE_ANON_KEY
)
