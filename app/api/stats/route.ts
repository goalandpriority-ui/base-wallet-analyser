export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import { getSupabase } from "@/lib/supabase"

export async function GET(){

const supabase = getSupabase()

/* =========================
   WALLETS COUNT (REAL FIX)
========================= */
const { data: walletsData } = await supabase
.from("leaderboard")
.select("wallet")

const wallets =
walletsData?.length || 0


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
   TRENDING (LATEST ACTIVE)
========================= */
const { data: trending } = await supabase
.from("leaderboard")
.select("*")
.order("updated_at",{ascending:false})
.limit(5)


/* =========================
   EXTRA: LIVE COUNT DEBUG
========================= */
const fiveMinAgo =
new Date(Date.now() - 5*60*1000).toISOString()

const { data: liveNow } = await supabase
.from("leaderboard")
.select("wallet")
.gte("updated_at", fiveMinAgo)

const liveCount =
liveNow?.length || 0


/* =========================
   RESPONSE
========================= */
return NextResponse.json({
wallets,
swaps,
volume,
trending,

/* debug (optional but useful) */
liveCount
})

}
