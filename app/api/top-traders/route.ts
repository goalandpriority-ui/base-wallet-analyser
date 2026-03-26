export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from "next/server"
import { getSupabase } from "@/lib/supabase"

export async function GET(req: NextRequest){

const supabase = getSupabase()

const { searchParams } = new URL(req.url)

const page = Number(searchParams.get("page") || 1)
const wallet = searchParams.get("wallet")

// ⚡ performance (1000 too high)
const limit = 20
const from = (page - 1) * limit
const to = from + limit - 1

// 🔥 only real traders (swapcount > 0)
const { data, error } = await supabase
.from("leaderboard")
.select("*")
.gt("swapcount", 0)
.order("swapcount", { ascending: false })
.range(from, to)

console.log("TRADERS ERROR:", error)

const mapped = (data || []).map(w => ({
wallet: w.wallet,
score: Number(w.score || 0),
swaps: Number(w.swapcount || 0),
volume: Number(w.tradingvolumeusd || 0),
paid: w.paid || false
}))

let yourRank = null

if(wallet){

const { data: all } = await supabase
.from("leaderboard")
.select("wallet,swapcount")
.gt("swapcount", 0)
.order("swapcount", { ascending: false })

const i = all?.findIndex(
w => w.wallet.toLowerCase() === wallet.toLowerCase()
)

if(i !== -1) yourRank = i + 1

}

return NextResponse.json({
data: mapped,
yourRank
})

}
