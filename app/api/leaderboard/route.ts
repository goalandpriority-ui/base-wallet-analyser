export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from "next/server"
import { getSupabase } from "@/lib/supabase"

/* USERNAME */
async function getUsername(wallet:string){

const address = wallet.toLowerCase()

/* FARCASTER — search-by-address (NEW FIX) */
try{

const r = await fetch(
`https://api.neynar.com/v2/farcaster/user/search-by-address?q=${address}`,
{
headers:{
"accept":"application/json",
"x-api-key": process.env.NEYNAR_API_KEY || ""
}
})

const j = await r.json()

const user =
j?.result?.users?.[0]

if(user?.username){
return "@"+user.username
}

}catch{}


/* FARCASTER (verification — primary) */
try{

const controller = new AbortController()
const timeout = setTimeout(()=>controller.abort(),1500)

const r = await fetch(
`https://api.neynar.com/v2/farcaster/user/by-verification?addresses=${address}`,
{
headers:{
"accept":"application/json",
"x-api-key": process.env.NEYNAR_API_KEY || ""
},
signal: controller.signal
}
)

clearTimeout(timeout)

const j = await r.json()

const user =
j?.result?.users?.[0]

if(user?.username){
return "@"+user.username
}

}catch{}


/* FARCASTER (bulk fallback — keep old logic + UNVERIFIED support) */
try{

const controller = new AbortController()
const timeout = setTimeout(()=>controller.abort(),1500)

const r = await fetch(
`https://api.neynar.com/v2/farcaster/user/bulk-by-address?addresses=${address}`,
{
headers:{
"accept":"application/json",
"x-api-key": process.env.NEYNAR_API_KEY || ""
},
signal: controller.signal
}
)

clearTimeout(timeout)

const j = await r.json()

const users =
j?.result?.[address]?.users ||
j?.result?.[address.toLowerCase()]?.users ||
j?.result?.[address.toUpperCase()]?.users ||
[]

for(const user of users){

if(user?.username){
return "@"+user.username
}

if(
user?.custody_address?.toLowerCase() === address
){
return "@"+user.username
}

const eth =
user?.verified_addresses?.eth_addresses || []

if(
eth.some((a:string)=>a.toLowerCase()===address)
){
return "@"+user.username
}

const sol =
user?.verified_addresses?.sol_addresses || []

if(
sol.some((a:string)=>a.toLowerCase()===address)
){
return "@"+user.username
}

const all =
[
...(user?.verified_addresses?.eth_addresses || []),
...(user?.verified_addresses?.sol_addresses || []),
user?.custody_address
].filter(Boolean)

if(
all.some((a:string)=>a.toLowerCase()===address)
){
return "@"+user.username
}

}

}catch{}


/* ENS fallback */
try{

const ens = await fetch(
`https://api.ensideas.com/ens/resolve/${address}`
)

const ej = await ens.json()

if(ej?.name){
return ej.name
}

}catch{}


/* BASE NAME fallback */
try{

const base = await fetch(
`https://api.basenames.org/v1/resolve/${address}`
)

const bj = await base.json()

if(bj?.name){
return bj.name
}

}catch{}


/* FINAL fallback short wallet */
return (
address.slice(0,6) +
"..." +
address.slice(-4)
)

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

/* mapped */
const mapped = await Promise.all(
(data || []).map(async (w)=>({

wallet: w.wallet,
username: await getUsername(w.wallet),

score: Number(w.score || 0),
swaps: Number(w.swapcount || 0),
volume: Number(w.tradingvolumeusd || 0),
days: Number(w.tradingdays || 0),
gas: Number(w.tradinggaseth || 0),
paid: w.paid || false

}))
)

/* LIVE ACTIVITY */
const fiveMinAgo =
new Date(Date.now() - 5*60*1000).toISOString()

const { data: liveRaw } = await supabase
.from("leaderboard")
.select("*")
.gte("updated_at", fiveMinAgo)
.order("updated_at",{ascending:false})
.limit(10)

const live = await Promise.all(
(liveRaw || []).map(async (w)=>({

wallet: w.wallet,
username: await getUsername(w.wallet),

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
