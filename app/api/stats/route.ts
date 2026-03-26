export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import { getSupabase } from "@/lib/supabase"

export async function GET(){

const supabase = getSupabase()

// ✅ ONLY REAL WALLETS
const { data, error } = await supabase
.from("leaderboard")
.select("*")
.gt("swapcount", 0)
.gt("tradingvolumeusd", 0)

console.log("STATS ERROR:", error)

let wallets = data?.length || 0
let swaps = 0
let volume = 0

for(const w of data || []){

swaps += Number(w.swapcount || 0)
volume += Number(w.tradingvolumeusd || 0)

}

// 🔥 TRENDING (same filter)
const { data: trending } = await supabase
.from("leaderboard")
.select("*")
.gt("swapcount", 0)
.gt("tradingvolumeusd", 0)
.order("updated_at", { ascending: false })
.limit(5)

return NextResponse.json({
wallets,
swaps,
volume,
trending
})

}
