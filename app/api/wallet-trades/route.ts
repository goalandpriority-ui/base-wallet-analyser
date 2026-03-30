export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from "next/server"
import axios from "axios"

const RPC = process.env.BASE_RPC!

/* swap topics */
const SWAP_TOPICS = [
"0xd78ad95fa46c994b6551d0da85fc275fe613fcd9a1d2c3c0f6b1c6f7a8d7a7d0", // V2
"0xc42079f94a6350d7e6235f29174924f928cc2ac818eb64fed8004e115fbcca67"  // V3
]

const STABLES = ["USDC","USDT","DAI"]

export async function POST(req:NextRequest){

try{

const { wallet } = await req.json()
if(!wallet) return NextResponse.json([])

const address = wallet.toLowerCase()

/* get logs */
const logs = await axios.post(RPC,{
jsonrpc:"2.0",
id:1,
method:"eth_getLogs",
params:[{
fromBlock:"0x0",
toBlock:"latest",
topics:[SWAP_TOPICS]
}]
})

const list = logs.data.result || []

const trades:any[]=[]

for(const log of list){

const data = log.data
const topics = log.topics

/* decode amounts (simplified) */
if(!data) continue

const amount0In =
parseInt(data.slice(2,66),16)

const amount1In =
parseInt(data.slice(66,130),16)

const amount0Out =
parseInt(data.slice(130,194),16)

const amount1Out =
parseInt(data.slice(194,258),16)

const buy =
amount0Out || amount1Out

const sell =
amount0In || amount1In

if(!buy && !sell) continue

trades.push({
symbol:"TOKEN",
buyUsd: buy / 1e6,
sellUsd: sell / 1e6,
pnl:(sell-buy)/1e6,
time: Date.now()
})

}

/* latest first */
trades.sort((a,b)=>b.time-a.time)

return NextResponse.json(trades.slice(0,50))

}catch(e){

console.error(e)
return NextResponse.json([])

}

}
