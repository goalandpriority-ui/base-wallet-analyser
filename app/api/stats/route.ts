export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import { getSupabase } from "@/lib/supabase"

export async function GET(){

const supabase = getSupabase()

const { data } = await supabase
.from("leaderboard")
.select("*")

let wallets = data?.length || 0
let swaps = 0
let volume = 0

for(const w of data || []){

// use OLD columns (your DB)
swaps += Number(w.swapcount || 0)
volume += Number(w.tradingvolumeusd || 0)

}

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
