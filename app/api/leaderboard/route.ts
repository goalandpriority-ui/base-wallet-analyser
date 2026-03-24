import { NextRequest, NextResponse } from "next/server"
import { getSupabase } from "@/lib/supabase"

export async function GET(req:NextRequest){

const supabase = getSupabase()

const { searchParams } = new URL(req.url)

const page = Number(searchParams.get("page") || 1)

const limit = 1000
const from = (page-1) * limit
const to = from + limit - 1

const { data } = await supabase
.from("leaderboard")
.select("*")
.order("score",{ascending:false})
.range(from,to)

const mapped = (data || []).map((w,i)=>({

rank: i+1,
wallet: w.wallet,

score: Number(w.score || 0),

/* IMPORTANT */
swaps: Number(w.swapcount || 0),
volume: Number(w.tradingvolumeusd || 0),

days: Number(w.tradingdays || 0),
gas: Number(w.tradinggaseth || 0),

paid: w.paid || false

}))

return NextResponse.json({
data:mapped
})

}
