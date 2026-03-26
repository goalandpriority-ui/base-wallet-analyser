export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from "next/server"
import { getSupabase } from "@/lib/supabase"

export async function GET(req:NextRequest){

const supabase = getSupabase()

const { searchParams } = new URL(req.url)

const page = Number(searchParams.get("page") || 1)
const wallet = searchParams.get("wallet")

const limit = 50
const from = (page-1) * limit
const to = from + limit - 1

// ✅ only real wallets
const { data } = await supabase
.from("leaderboard")
.select("*")
.gt("score",0)
.order("score",{ascending:false})
.range(from,to)

const mapped = (data || []).map(w=>({

wallet: w.wallet,
score: Number(w.score || 0),

swaps: Number(
w.swaps ??
w.swapcount ??
0
),

volume: Number(
w.volume ??
w.tradingvolumeusd ??
0
),

days: Number(
w.days ??
w.tradingdays ??
0
),

gas: Number(
w.gas ??
w.tradinggaseth ??
0
),

paid: w.paid || false

}))

let yourRank=null

if(wallet){

const { data:all } = await supabase
.from("leaderboard")
.select("wallet,score")
.gt("score",0)
.order("score",{ascending:false})

const index = all?.findIndex(
w=>w.wallet.toLowerCase()===wallet.toLowerCase()
)

if(index!==-1) yourRank=index+1

}

const globalStats = {
wallets: mapped.length,
swaps: mapped.reduce((a,b)=>a+b.swaps,0),
volume: mapped.reduce((a,b)=>a+b.volume,0)
}

return NextResponse.json({
data:mapped,
yourRank,
globalStats
})

}
