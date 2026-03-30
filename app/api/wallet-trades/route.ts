export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from "next/server"
import axios from "axios"

const SWAP_TOPIC =
"0xd78ad95fa46c994b6551d0da85fc275fe613d1e6c5b1e5b9e5a6a7a7a7a7a7a7" // Uniswap swap

export async function POST(req:NextRequest){

try{

const { wallet } = await req.json()
if(!wallet) return NextResponse.json([])

const address = wallet.toLowerCase()

/* get txs */
const res = await axios.post(process.env.BASE_RPC!,{
jsonrpc:"2.0",
id:1,
method:"alchemy_getAssetTransfers",
params:[{
fromBlock:"0x0",
toBlock:"latest",
category:["external"],
fromAddress:address,
maxCount:"0x64"
}]
})

const txs = res.data.result?.transfers || []

const trades:any[]=[]

for(const tx of txs){

try{

/* get receipt */
const receipt = await axios.post(process.env.BASE_RPC!,{
jsonrpc:"2.0",
id:1,
method:"eth_getTransactionReceipt",
params:[tx.hash]
})

const logs = receipt.data.result?.logs || []

let tokenIn:any=null
let tokenOut:any=null

for(const log of logs){

/* transfer event */
if(log.topics[0] ===
"0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a0b6f9e6f")
{

const from =
"0x"+log.topics[1].slice(26)

const to =
"0x"+log.topics[2].slice(26)

const value =
parseInt(log.data,16) / 1e18

if(to.toLowerCase()===address){
tokenIn={
token:log.address,
amount:value
}
}

if(from.toLowerCase()===address){
tokenOut={
token:log.address,
amount:value
}
}

}

}

/* real swap */
if(tokenIn && tokenOut){

trades.push({
tokenIn:tokenIn.token,
tokenOut:tokenOut.token,
amountIn:tokenOut.amount,
amountOut:tokenIn.amount,
hash:tx.hash
})

}

}catch{}

}

return NextResponse.json(trades)

}catch(e){
console.error(e)
return NextResponse.json([])
}

}
