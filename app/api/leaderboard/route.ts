import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function GET() {

  const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  const { data } = await supabase
    .from("leaderboard")
    .select("*")
    .gte("created_at", last24h)
    .order("score", { ascending: false })
    .limit(100)

  return NextResponse.json(data || [])
}
