export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import { getSupabase } from "@/lib/supabase"

export async function GET(){

const supabase = getSupabase()

// ✅ GLOBAL STATS (ALL wallets)
const { data } = await supabase
.from("leaderboard")
.select("swapcount,tradingvolumeusd")

let wallets = data?.length || 0
let swaps = 0
let volume = 0

for(const w of data || []){

swaps += Number(w.swapcount || 0)
volume += Number(w.tradingvolumeusd || 0)

}

// ✅ LAST 5 MINUTES
const fiveMinAgo = new Date(
Date.now() - 5 * 60 * 1000
).toISOString()

const { data: trending } = await supabase
.from("leaderboard")
.select("*")
.gt("updated_at", fiveMinAgo)
.order("updated_at",{ascending:false})
.limit(10)

return NextResponse.json({
wallets,
swaps,
volume,
trending
})

}
