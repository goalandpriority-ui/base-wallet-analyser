export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import { getSupabase } from "@/lib/supabase"

export async function GET(){

const supabase = getSupabase()

// fetch all leaderboard rows
const { data, error } = await supabase
.from("leaderboard")
.select("wallet,score,swapcount,tradingvolumeusd,tradingdays,tradinggaseth,updated_at")

console.log("STATS ERROR:", error)
console.log("STATS DATA:", data)

let wallets = 0
let swaps = 0
let volume = 0

for(const w of data || []){

// skip invalid / dummy rows
if(!w.wallet) continue

wallets++

swaps += Number(
w.swapcount ?? 0
)

volume += Number(
w.tradingvolumeusd ?? 0
)

}

// trending wallets (latest analysed)
const { data: trending } = await supabase
.from("leaderboard")
.select("wallet,score,swapcount,tradingvolumeusd")
.order("updated_at",{ascending:false})
.limit(5)

return NextResponse.json({
wallets,
swaps,
volume: Number(volume.toFixed(2)),
trending: trending || []
})

}
