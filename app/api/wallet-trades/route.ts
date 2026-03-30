export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from "next/server"
import axios from "axios"

const RPC = process.env.BASE_RPC!

/* swap topics */
const TOPICS = [
"0xd78ad95fa46c994b6551d0da85fc275fe613fcd9a1d2c3c0f6b1c6f7a8d7a7d0",
"0xc42079f94a6350d7e6235f29174924f928cc2ac818eb64fed8004e115fbcca67"
]

export async function POST(req:NextRequest){

try{

const { wallet } = await req.json()
if(!wallet) return NextResponse.json([])

const address = wallet.toLowerCase()

/* get wallet tx first */
const txs = await axios.post(RPC,{
jsonrpc:"2.0",
id:1,
method:"alchemy_getAssetTransfers",
params:[{
fromAddress:address,
category:["external","erc20"],
withMetadata:true,
maxCount:"0x64"
}]
})

const transfers = txs.data.result?.transfers || []

const hashes =
transfers.map((t:any)=>t.hash)

const trades:any[]=[]

for(const hash of hashes){

const receipt = await axios.post(RPC,{
jsonrpc:"2.0",
id:1,
method:"eth_getTransactionReceipt",
params:[hash]
})

const logs = receipt.data.result?.logs || []

for(const log of logs){

if(!TOPICS.includes(log.topics?.[0]))
continue

const data = log.data

const amount0In =
parseInt(data.slice(2,66),16)

const amount1In =
parseInt(data.slice(66,130),16)

const amount0Out =
parseInt(data.slice(130,194),16)

const amount1Out =
parseInt(data.slice(194,258),16)

const buy = amount0Out || amount1Out
const sell = amount0In || amount1In

if(!buy && !sell) continue

trades.push({
symbol:"TOKEN",
buyUsd: buy/1e6,
sellUsd: sell/1e6,
pnl:(sell-buy)/1e6,
time:Date.now()
})

}

}

return NextResponse.json(trades.slice(0,30))

}catch(e){

console.error(e)
return NextResponse.json([])

}

}
