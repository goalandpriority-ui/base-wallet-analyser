export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from "next/server"
import { getSupabase } from "@/lib/supabase"

/* USERNAME */
async function getUsername(wallet:string){

try{
const r = await fetch(
`https://api.neynar.com/v2/farcaster/user/bulk-by-address?addresses=${wallet}`
)

const j = await r.json()

const user =
j?.result?.[wallet?.toLowerCase()]?.[0]

if(user?.username){
return user.username
}
}catch{}

try{
const ens = await fetch(
`https://api.ensideas.com/ens/resolve/${wallet}`
)

const ej = await ens.json()

if(ej?.name){
return ej.name
}
}catch{}

return null
}

export async function GET(req:NextRequest){

const supabase = getSupabase()

const { searchParams } = new URL(req.url)

const page = Number(searchParams.get("page") || 1)
const wallet = searchParams.get("wallet")

const limit = 20
const from = (page-1) * limit
const to = from + limit - 1

/* leaderboard */
const { data, count } = await supabase
.from("leaderboard")
.select("*",{ count:"exact" })
.order("score",{ascending:false})
.range(from,to)

/* SAME LOGIC + username add */
const mapped = await Promise.all(
(data || []).map(async (w)=>({

wallet: w.wallet,
username: await getUsername(w.wallet),  // <-- added only this
score: Number(w.score || 0),
swaps: Number(w.swapcount || 0),
volume: Number(w.tradingvolumeusd || 0),
days: Number(w.tradingdays || 0),
gas: Number(w.tradinggaseth || 0),
paid: w.paid || false

}))
)

/* LIVE ACTIVITY — last 5 mins */
const fiveMinAgo = new Date(Date.now() - 5*60*1000).toISOString()

const { data: liveRaw } = await supabase
.from("leaderboard")
.select("*")
.gte("updated_at", fiveMinAgo)
.order("updated_at",{ascending:false})
.limit(10)

const live = await Promise.all(
(liveRaw || []).map(async (w)=>({

wallet: w.wallet,
username: await getUsername(w.wallet), // <-- added only this
score: Number(w.score || 0),
swaps: Number(w.swapcount || 0),
volume: Number(w.tradingvolumeusd || 0)

}))
)

let yourRank=null

if(wallet){

const { data:all } = await supabase
.from("leaderboard")
.select("wallet,score")
.order("score",{ascending:false})

const index = all?.findIndex(
w=>w.wallet.toLowerCase()===wallet.toLowerCase()
)

if(index!==-1) yourRank=index+1

}

return NextResponse.json({
data:mapped,
live,
yourRank,
total: count,
page,
hasMore: (count || 0) > to + 1
})

}
