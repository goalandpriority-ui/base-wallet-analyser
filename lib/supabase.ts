import { createClient } from "@supabase/supabase-js"

export const getSupabase = () => {

  const supabaseUrl =
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL

  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl) {
    throw new Error("Missing SUPABASE URL")
  }

  if (!supabaseKey) {
    throw new Error("Missing SUPABASE SERVICE ROLE KEY")
  }

  return createClient(supabaseUrl, supabaseKey)
}
