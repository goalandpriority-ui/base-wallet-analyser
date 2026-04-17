export const dynamic = "force-dynamic"
export const revalidate = 0

import { NextResponse } from "next/server"
import { getSupabase } from "@/lib/supabase"

export async function GET(){

const supabase = getSupabase()

/* =========================
   GET ALL WALLETS (NO LIMIT FIX)
========================= */
let allWallets:any[] = []
let from = 0
const limit = 1000

while(true){

const { data,error } = await supabase
.from("leaderboard")
.select("wallet")
.range(from, from + limit - 1)

if(error){
console.error("wallet fetch error",error)
break
}

if(!data || data.length === 0) break

allWallets = [...allWallets, ...data]

if(data.length < limit) break

from += limit
}

/* =========================
   UNIQUE WALLETS COUNT
========================= */
const uniqueWallets = new Set(
(allWallets || [])
.filter((w:any)=>w?.wallet)
.map((w:any)=>String(w.wallet).toLowerCase().trim())
)

const wallets = uniqueWallets.size


/* =========================
   TOTAL SWAPS (NO LIMIT FIX)
========================= */
let allSwaps:any[] = []
from = 0

while(true){

const { data,error } = await supabase
.from("leaderboard")
.select("swapcount")
.range(from, from + limit - 1)

if(error){
console.error("swap fetch error",error)
break
}

if(!data || data.length === 0) break

allSwaps = [...allSwaps, ...data]

if(data.length < limit) break

from += limit
}

let swaps = 0

for(const w of allSwaps || []){
swaps += Number(w?.swapcount || 0)
}


/* =========================
   TOTAL VOLUME (NO LIMIT FIX)
========================= */
let allVolume:any[] = []
from = 0

while(true){

const { data,error } = await supabase
.from("leaderboard")
.select("tradingvolumeusd")
.range(from, from + limit - 1)

if(error){
console.error("volume fetch error",error)
break
}

if(!data || data.length === 0) break

allVolume = [...allVolume, ...data]

if(data.length < limit) break

from += limit
}

let volume = 0

for(const v of allVolume || []){
volume += Number(v?.tradingvolumeusd || 0)
}


/* =========================
   TRENDING (KEEP OLD LOGIC)
========================= */
const { data: trending } = await supabase
.from("leaderboard")
.select("*")
.order("updated_at",{ascending:false})
.limit(5)


/* =========================
   RESPONSE + CACHE FIX
========================= */
return NextResponse.json(
{
wallets,
swaps,
volume,
trending
},
{
headers:{
"Cache-Control":"no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0"
}
}
)

}
