export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import { getSupabase } from "@/lib/supabase"

export async function GET(){

try{

const supabase = getSupabase()

const { data, error } = await supabase
.from("leaderboard")
.select("*")

if(error){
console.log("stats error",error)
return NextResponse.json({
wallets:0,
swaps:0,
volume:0,
trending:[]
})
}

let wallets = data?.length || 0
let swaps = 0
let volume = 0

for(const w of data || []){

swaps += Number(
w.swaps ??
w.swapcount ??
0
)

volume += Number(
w.volume ??
w.tradingvolumeusd ??
0
)

}

const fiveMinAgo =
new Date(Date.now() - 5 * 60 * 1000).toISOString()

const { data: trending } = await supabase
.from("leaderboard")
.select("*")
.gte("updated_at", fiveMinAgo)
.order("updated_at",{ascending:false})
.limit(5)

return NextResponse.json({
wallets,
swaps,
volume,
trending: trending || []
})

}catch(e){

console.log("stats crash",e)

return NextResponse.json({
wallets:0,
swaps:0,
volume:0,
trending:[]
})

}

}
