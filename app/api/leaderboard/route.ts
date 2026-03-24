import { NextRequest, NextResponse } from "next/server"
import { getSupabase } from "@/lib/supabase"

export async function GET(req:NextRequest){

const supabase = getSupabase()

const { searchParams } = new URL(req.url)

const page = Number(searchParams.get("page") || 1)
const wallet = searchParams.get("wallet")

const limit = 1000
const from = (page-1) * limit
const to = from + limit - 1

const { data } = await supabase
.from("leaderboard")
.select("*")
.order("score",{ascending:false})
.range(from,to)

/* MAP FIELDS */
const mapped = (data || []).map(w=>({
wallet: w.wallet,
score: w.score || 0,
swaps: w.swapcount || 0,
volume: w.tradingvolumeusd || 0,
paid: w.paid || false
}))

let yourRank=null

if(wallet){

const { data:all } = await supabase
.from("leaderboard")
.select("wallet,score")
.order("score",{ascending:false})

const index = all?.findIndex(
w=>w.wallet.toLowerCase()===wallet.toLowerCase()
)

if(index!==-1) yourRank=index+1

}

return NextResponse.json({
data:mapped,
yourRank
})

}
