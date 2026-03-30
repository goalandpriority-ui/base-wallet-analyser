export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from "next/server"
import axios from "axios"

const STABLES = ["USDC","USDT","DAI"]
const ETH = ["ETH","WETH"]

export async function POST(req:NextRequest){

try{

const { wallet } = await req.json()
if(!wallet) return NextResponse.json([])

const address = wallet.toLowerCase()

let all:any[]=[]
let pageKey: string | undefined = undefined

const fetch = async(type:"fromAddress"|"toAddress")=>{

pageKey = undefined

do{

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
pageKey,
[type]:address
}]
})

all = all.concat(res.data.result?.transfers || [])
pageKey = res.data.result?.pageKey

}while(pageKey)

}

await fetch("fromAddress")
await fetch("toAddress")

/* group by tx hash */
const txMap = new Map<string,any[]>()

for(const t of all){
if(!txMap.has(t.hash)){
txMap.set(t.hash,[])
}
txMap.get(t.hash)!.push(t)
}

const positions:Record<string,any>={}
const trades:any[]=[]

for(const [hash, txs] of txMap){

let sent:any=null
let received:any=null

for(const t of txs){

const symbol = (t.asset || "").toUpperCase()
const value = Number(t.value || 0)

if(!value) continue

if(t.from?.toLowerCase()===address){
sent={symbol,value}
}

if(t.to?.toLowerCase()===address){
received={symbol,value}
}

}

if(!sent || !received) continue
if(sent.symbol===received.symbol) continue

/* BUY */
if(
STABLES.includes(sent.symbol) ||
ETH.includes(sent.symbol)
){
positions[received.symbol]={
symbol:received.symbol,
buy:sent.value,
time:txs[0]?.metadata?.blockTimestamp
}
}

/* SELL */
if(
STABLES.includes(received.symbol) ||
ETH.includes(received.symbol)
){

const pos = positions[sent.symbol]
if(!pos) continue

const sell = received.value
const pnl = sell - pos.buy

trades.push({
symbol:sent.symbol,
buyUsd:pos.buy,
sellUsd:sell,
pnl,
time:pos.time
})

delete positions[sent.symbol]

}

}

trades.sort((a,b)=>
new Date(b.time).getTime() -
new Date(a.time).getTime()
)

return NextResponse.json(trades)

}catch(e){
console.error(e)
return NextResponse.json([])
}

}
