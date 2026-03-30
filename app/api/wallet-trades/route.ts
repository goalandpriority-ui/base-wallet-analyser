export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from "next/server"
import axios from "axios"

const STABLES = ["USDC","USDT","DAI"]
const ETH = ["ETH","WETH"]

export async function POST(req: NextRequest) {

try {

const { wallet } = await req.json()
if (!wallet) return NextResponse.json([])

const address = wallet.toLowerCase()

let all:any[]=[]
let pageKey: string | undefined = undefined

do{

const res = await axios.post(process.env.BASE_RPC!,{
jsonrpc:"2.0",
id:1,
method:"alchemy_getAssetTransfers",
params:[{
fromBlock:"0x0",
toBlock:"latest",
category:["external","erc20"],
withMetadata:true,
excludeZeroValue:true,
maxCount:"0x3e8",
pageKey,
fromAddress:address
}]
})

all = all.concat(res.data.result?.transfers || [])
pageKey = res.data.result?.pageKey

}while(pageKey)

const trades:any[]=[]

for(const t of all){

const symbol = (t.asset || "").toUpperCase()
const value = Number(t.value || 0)

if(!value) continue

/* ignore spam */
if(
symbol.length > 12 ||
symbol.includes(".") ||
symbol.includes(" ")
) continue

/* only real tokens */
if(
STABLES.includes(symbol) ||
ETH.includes(symbol)
) continue

trades.push({
symbol,
buyUsd:value,
sellUsd:0,
pnl:0,
time:t.metadata?.blockTimestamp
})

}

trades.sort((a,b)=>
new Date(b.time).getTime() -
new Date(a.time).getTime()
)

return NextResponse.json(trades.slice(0,20))

} catch (e) {

console.error(e)
return NextResponse.json([])

}

}
