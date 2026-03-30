export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from "next/server"
import axios from "axios"

export async function POST(req:NextRequest){

try{

const { wallet } = await req.json()
if(!wallet) return NextResponse.json([])

const address = wallet.toLowerCase()

/* fetch transfers */
const res = await axios.post(process.env.BASE_RPC!,{
jsonrpc:"2.0",
id:1,
method:"alchemy_getAssetTransfers",
params:[{
fromBlock:"0x0",
toBlock:"latest",
category:["erc20"],
withMetadata:true,
excludeZeroValue:true,
maxCount:"0x3e8",
fromAddress:address
}]
})

const transfers = res.data.result?.transfers || []

const trades:any[]=[]

for(const t of transfers){

const token = t.rawContract?.address
const symbol = t.asset
const amount = Number(t.value || 0)

if(!token || !amount) continue

/* fetch price from Dexscreener */
try{

const priceRes = await axios.get(
`https://api.dexscreener.com/latest/dex/tokens/${token}`
)

const pair = priceRes.data?.pairs?.[0]
if(!pair) continue

const price = Number(pair.priceUsd || 0)
if(!price) continue

const usd = amount * price

trades.push({
symbol,
buyUsd: usd,
sellUsd:0,
pnl:0,
entry: price,
exit:0,
time:t.metadata?.blockTimestamp
})

}catch{}

}

trades.sort((a,b)=>
new Date(b.time).getTime() -
new Date(a.time).getTime()
)

return NextResponse.json(trades.slice(0,25))

}catch(e){
console.error(e)
return NextResponse.json([])
}

}
