export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from "next/server"
import { getSupabase } from "@/lib/supabase"

export async function GET(req: NextRequest){

const supabase = getSupabase()

const { searchParams } = new URL(req.url)

const page = Number(searchParams.get("page") || 1)
const wallet = searchParams.get("wallet")

const limit = 20
const from = (page - 1) * limit
const to = from + limit - 1

/* =========================
TOP TRADERS (LIKE VOLUME PAGE)
SORT BY SWAPS
========================= */
const { data, count } = await supabase
.from("leaderboard")
.select("*",{ count:"exact" })
.order("swapcount",{
ascending:false,
nullsFirst:false
})
.range(from,to)

/* =========================
MAP DATA
========================= */
const mapped = (data || []).map((w:any)=>({

wallet: w.wallet,
score: Number(w.score || 0),
swaps: Number(w.swapcount || 0),
volume: Number(w.tradingvolumeusd || 0),
days: Number(w.tradingdays || 0),
gas: Number(w.tradinggaseth || 0),
paid: w.paid || false

}))

/* =========================
YOUR RANK
========================= */
let yourRank = null

if(wallet){

const { data: all } = await supabase
.from("leaderboard")
.select("wallet,swapcount")
.order("swapcount",{
ascending:false,
nullsFirst:false
})

const index = all?.findIndex(
(w:any)=>
w.wallet?.toLowerCase() === wallet.toLowerCase()
)

if(index !== -1){
yourRank = index + 1
}

}

/* =========================
RETURN
========================= */
return NextResponse.json({
data: mapped,
yourRank,
total: count,
page,
hasMore: (count || 0) > to + 1
})

}
