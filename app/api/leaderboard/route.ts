import { NextResponse } from "next/server"
import { getSupabase } from "@/lib/supabase"

export async function GET() {
  try {
    const supabase = getSupabase()

    const last24h = new Date(
      Date.now() - 24 * 60 * 60 * 1000
    ).toISOString()

    const { data, error } = await supabase
      .from("leaderboard")
      .select("*")
      .gte("created_at", last24h)
      .order("score", { ascending: false })
      .limit(50)

    if (error) {
      return NextResponse.json([])
    }

    return NextResponse.json(data || [])

  } catch {
    return NextResponse.json([])
  }
}
