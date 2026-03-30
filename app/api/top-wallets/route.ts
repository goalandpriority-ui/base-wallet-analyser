export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from "next/server"
import { getSupabase } from "@/lib/supabase"

export async function GET(req:NextRequest){

const supabase = getSupabase()

const { searchParams } = new URL(req.url)

const page = Number(searchParams.get("page") || 1)
const wallet = searchParams.get("wallet")

const limit = 20
const from = (page - 1) * limit
const to = from + limit - 1

/* fetch page */
const { data } = await supabase
.from("leaderboard")
.select("*")
.order("score",{ascending:false})
.range(from,to)

const mapped = (data || []).map(w=>({
wallet: w.wallet,
score: Number(w.score || 0),
swaps: Number(w.swapcount || 0),
volume: Number(w.tradingvolumeusd || 0),
paid: w.paid || false
}))

/* FAST rank calc */
let yourRank = null

if(wallet){

const { count } = await supabase
.from("leaderboard")
.select("*",{count:"exact",head:true})
.gt("score",
(
await supabase
.from("leaderboard")
.select("score")
.eq("wallet",wallet)
.single()
).data?.score || 0
)

yourRank = (count || 0) + 1

}

return NextResponse.json({
data: mapped,
yourRank,
page
})

}
