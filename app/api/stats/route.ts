export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import { getSupabase } from "@/lib/supabase"

export async function GET(){

const supabase = getSupabase()

/* wallets count */
const { count } = await supabase
.from("leaderboard")
.select("*",{count:"exact",head:true})

/* total swaps */
const { data: swapsData } = await supabase
.from("leaderboard")
.select("swapcount")

/* total volume */
const { data: volumeData } = await supabase
.from("leaderboard")
.select("tradingvolumeusd")

let swaps = 0
let volume = 0

for(const w of swapsData || []){
swaps += Number(w.swapcount || 0)
}

for(const v of volumeData || []){
volume += Number(v.tradingvolumeusd || 0)
}

/* trending */
const { data: trending } = await supabase
.from("leaderboard")
.select("*")
.order("updated_at",{ascending:false})
.limit(5)

return NextResponse.json({
wallets: count || 0,
swaps,
volume,
trending
})

}
