export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function GET(){

const supabase = createClient(
process.env.NEXT_PUBLIC_SUPABASE_URL!,
process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const { data } = await supabase
.from("leaderboard")
.select("*")

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
