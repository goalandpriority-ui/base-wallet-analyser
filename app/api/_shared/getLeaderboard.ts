import { getSupabase } from "@/lib/supabase"

export async function getLeaderboard(
order:string,
page:number
){

const supabase=getSupabase()

const limit=1000
const from=(page-1)*limit
const to=from+limit-1

const { data } = await supabase
.from("leaderboard")
.select("*")
.order(order,{ascending:false})
.range(from,to)

return (data || []).map(w=>({

wallet:w.wallet,

score:w.score || 0,

swaps:w.swapCount || 0,

volume:w.tradingVolumeUSD || 0,

days:w.tradingDays || 0,

gas:w.tradingGasETH || 0,

paid:w.paid || false

}))

}
