import { createClient } from "@supabase/supabase-js"

export const getSupabase = () => {

  const supabaseUrl =
    process.env.SUPABASE_URL ??
    process.env.NEXT_PUBLIC_SUPABASE_URL

  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // ✅ don't crash during build
  if (!supabaseUrl || !supabaseKey) {
    return createClient(
      "https://placeholder.supabase.co",
      "placeholder"
    )
  }

  return createClient(supabaseUrl, supabaseKey)
}
