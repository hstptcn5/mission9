import { createClient } from '@supabase/supabase-js'

let cachedClient = null

export const getSupabaseClient = () => {
  if (cachedClient) return cachedClient

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase environment variables are missing')
    return null
  }

  cachedClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
    },
  })

  return cachedClient
}

export const leaderboardTable = 'leaderboard_entries'

