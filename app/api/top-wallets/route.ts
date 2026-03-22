import { NextResponse } from "next/server"
import { getSupabase } from "@/lib/supabase"

export async function GET() {

const supabase = getSupabase()

const { data } = await supabase
.from("leaderboard")
.select("*")
.order("score", { ascending:false })
.limit(50)

return NextResponse.json(data || [])
}
