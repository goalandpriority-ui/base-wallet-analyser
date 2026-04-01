export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from "next/server"
import { getSupabase } from "@/lib/supabase"

export async function GET(req:NextRequest){

const supabase = getSupabase()

const { searchParams } = new URL(req.url)

const page = Number(searchParams.get("page") || 1)
const wallet = searchParams.get("wallet")

const limit = 20
const from = (page-1) * limit
const to = from + limit - 1

/* SORT BY VOLUME */
const { data, count } = await supabase
.from("leaderboard")
.select("*",{ count:"exact" })
.order("tradingvolumeusd",{ascending:false})
.range(from,to)

const mapped = (data || []).map(w=>({

wallet: w.wallet,
score: Number(w.score || 0),
swaps: Number(w.swapcount || 0),
volume: Number(w.tradingvolumeusd || 0),
days: Number(w.tradingdays || 0),
gas: Number(w.tradinggaseth || 0),
paid: w.paid || false

}))

let yourRank=null

/* SAME LOGIC AS LEADERBOARD */
if(wallet){

const { data:all } = await supabase
.from("leaderboard")
.select("wallet,tradingvolumeusd")
.order("tradingvolumeusd",{ascending:false})

const index = all?.findIndex(
w=>w.wallet.toLowerCase()===wallet.toLowerCase()
)

if(index!==-1) yourRank=index+1

}

return NextResponse.json({
data:mapped,
yourRank,
total: count,
page,
hasMore: (count || 0) > to + 1
})

}
