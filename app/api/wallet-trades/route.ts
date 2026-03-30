export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from "next/server"
import axios from "axios"

const RPC = process.env.BASE_RPC!

/* correct swap topics */
const SWAP_TOPICS = [
"0xd78ad95fa46c994b6551d0da85fc275fe613fcd9a1d2c3c0f6b1c6f7a8d7a7d0",
"0xc42079f94a6350d7e6235f29174924f928cc2ac818eb64fed8004e115fbcca67"
]

export async function POST(req:NextRequest){

try{

const { wallet } = await req.json()
if(!wallet) return NextResponse.json([])

const address = wallet.toLowerCase()

/* latest block */
const latest = await axios.post(RPC,{
jsonrpc:"2.0",
id:1,
method:"eth_blockNumber",
params:[]
})

const block = parseInt(latest.data.result,16)
const fromBlock = block - 5000

/* FIXED topics */
const logs = await axios.post(RPC,{
jsonrpc:"2.0",
id:1,
method:"eth_getLogs",
params:[{
fromBlock:"0x"+fromBlock.toString(16),
toBlock:"latest",
topics:[SWAP_TOPICS]  // ← correct nested
}]
})

const trades:any[]=[]

for(const log of logs.data.result){

const tx = await axios.post(RPC,{
jsonrpc:"2.0",
id:1,
method:"eth_getTransactionByHash",
params:[log.transactionHash]
})

const from =
tx.data.result?.from?.toLowerCase()

const to =
tx.data.result?.to?.toLowerCase()

if(from !== address && to !== address)
continue

const data = log.data

const a0in = parseInt(data.slice(2,66),16)
const a1in = parseInt(data.slice(66,130),16)
const a0out = parseInt(data.slice(130,194),16)
const a1out = parseInt(data.slice(194,258),16)

const buy = a0out || a1out
const sell = a0in || a1in

if(!buy && !sell) continue

trades.push({
symbol:"TOKEN",
buyUsd: buy/1e6,
sellUsd: sell/1e6,
pnl:(sell-buy)/1e6,
time:Date.now()
})

}

return NextResponse.json(trades.slice(0,20))

}catch(e){

console.log(e)
return NextResponse.json([])

}

}
