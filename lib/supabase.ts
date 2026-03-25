import { createClient } from "@supabase/supabase-js"

export const getSupabase = () => {

  const supabaseUrl =
    process.env.SUPABASE_URL ??
    process.env.NEXT_PUBLIC_SUPABASE_URL

  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // 🔥 Don't crash during build
  if (!supabaseUrl || !supabaseKey) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("Supabase env missing")
    }

    // build time fallback (won't be used)
    return createClient(
      "https://placeholder.supabase.co",
      "placeholder"
    )
  }

  return createClient(supabaseUrl, supabaseKey)
}
