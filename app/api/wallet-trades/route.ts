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

let allTransfers:any[]=[]
let pageKey: string | undefined = undefined

const fetchTransfers = async(type:"fromAddress"|"toAddress")=>{

pageKey = undefined

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
[type]:address
}]
})

const transfers = res.data.result?.transfers || []
allTransfers = allTransfers.concat(transfers)

pageKey = res.data.result?.pageKey

if(allTransfers.length > 8000) break

}while(pageKey)

}

await fetchTransfers("fromAddress")
await fetchTransfers("toAddress")

/* group tx */
const txMap = new Map<string,any[]>()

for(const tx of allTransfers){
if(!txMap.has(tx.hash)){
txMap.set(tx.hash,[])
}
txMap.get(tx.hash)!.push(tx)
}

const trades:any[]=[]

for(const [hash, transfers] of txMap){

let sent:any=null
let received:any=null

for(const t of transfers){

const asset = (t.asset || "").toUpperCase()
const value = Number(t.value || 0)

if(!value) continue

if(t.from?.toLowerCase()===address){
sent={symbol:asset,amount:value}
}

if(t.to?.toLowerCase()===address){
received={symbol:asset,amount:value}
}

}

if(!sent || !received) continue
if(sent.symbol===received.symbol) continue

let token=""
let buyUsd=0
let sellUsd=0

/* BUY */
if(
STABLES.includes(sent.symbol) ||
ETH.includes(sent.symbol)
){
token = received.symbol

buyUsd =
ETH.includes(sent.symbol)
? sent.amount * 3000
: sent.amount
}

/* SELL */
if(
STABLES.includes(received.symbol) ||
ETH.includes(received.symbol)
){
token = sent.symbol

sellUsd =
ETH.includes(received.symbol)
? received.amount * 3000
: received.amount
}

if(!token) continue

trades.push({
token,
buyUsd,
sellUsd,
time:transfers[0]?.metadata?.blockTimestamp
})

}

/* merge positions */

const map:Record<string,any>={}
const result:any[]=[]

for(const t of trades){

if(!map[t.token]){
map[t.token]={
symbol:t.token,
buyUsd:0,
sellUsd:0,
time:t.time
}
}

if(t.buyUsd) map[t.token].buyUsd+=t.buyUsd
if(t.sellUsd) map[t.token].sellUsd+=t.sellUsd

if(
map[t.token].buyUsd>0 &&
map[t.token].sellUsd>0
){

const p = map[t.token]

const pnl = p.sellUsd - p.buyUsd
const pnlPercent = (pnl/p.buyUsd)*100

result.push({
symbol:p.symbol,
buyUsd:p.buyUsd,
sellUsd:p.sellUsd,
entry:(p.buyUsd/1000).toFixed(6),
exit:(p.sellUsd/1000).toFixed(6),
pnl,
pnlPercent,
time:p.time
})

delete map[t.token]

}

}

result.sort((a,b)=>
new Date(b.time).getTime() -
new Date(a.time).getTime()
)

return NextResponse.json(result)

}catch(e){
console.error(e)
return NextResponse.json([])
}

}
