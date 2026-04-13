export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import { getSupabase } from "@/lib/supabase"

export async function GET(){

const supabase = getSupabase()

/* =========================
   UNIQUE WALLETS COUNT (REAL FIX)
========================= */
const { data: walletsData } = await supabase
.from("leaderboard")
.select("wallet")

const uniqueWallets = new Set(
(walletsData || []).map((w:any)=>w.wallet.toLowerCase())
)

const wallets = uniqueWallets.size


/* =========================
   TOTAL SWAPS
========================= */
const { data: swapsData } = await supabase
.from("leaderboard")
.select("swapcount")

let swaps = 0

for(const w of swapsData || []){
swaps += Number(w.swapcount || 0)
}


/* =========================
   TOTAL VOLUME
========================= */
const { data: volumeData } = await supabase
.from("leaderboard")
.select("tradingvolumeusd")

let volume = 0

for(const v of volumeData || []){
volume += Number(v.tradingvolumeusd || 0)
}


/* =========================
   TRENDING
========================= */
const { data: trending } = await supabase
.from("leaderboard")
.select("*")
.order("updated_at",{ascending:false})
.limit(5)


return NextResponse.json({
wallets,
swaps,
volume,
trending
})

}
