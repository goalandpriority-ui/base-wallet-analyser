export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from "next/server"
import axios from "axios"

const STABLES = ["USDC","USDT","DAI"]
const ETH = ["ETH","WETH"]

export async function POST(req:NextRequest){

try{

const { wallet } = await req.json()

if(!wallet){
return NextResponse.json([])
}

const address = wallet.toLowerCase()

/* fetch transfers */

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

const t = res.data.result?.transfers || []
all = all.concat(t)

pageKey = res.data.result?.pageKey

if(all.length>5000) break

}while(pageKey)

/* group tx */

const map = new Map<string,any[]>()

for(const tx of all){
if(!map.has(tx.hash)){
map.set(tx.hash,[])
}
map.get(tx.hash)!.push(tx)
}

let trades:any[]=[]

for(const [hash, transfers] of map){

let sent:any=null
let received:any=null

for(const t of transfers){

const asset = (t.asset || "").toUpperCase()
const value = Number(t.value || 0)

if(!value) continue

/* wallet sent */
if(t.from?.toLowerCase()===address){

if(STABLES.includes(asset) || ETH.includes(asset)){
sent={
symbol:asset,
amount:value
}
}else{
sent={
symbol:asset,
amount:value
}
}

}

/* wallet received */
if(t.to?.toLowerCase()===address){

received={
symbol:asset,
amount:value
}

}

}

/* must be swap */
if(!sent || !received) continue

/* ignore transfer same token */
if(sent.symbol===received.symbol) continue

/* detect buy */
let buyUsd=0
let sellUsd=0
let token=""

/* buy token */
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

/* sell token */
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

/* timestamp */
const time =
transfers[0]?.metadata?.blockTimestamp

trades.push({
hash,
token,
buyUsd,
sellUsd,
time
})

}

/* merge buy + sell */

const positions:Record<string,any>={}
const result:any[]=[]

for(const t of trades){

if(!t.token) continue

if(!positions[t.token]){
positions[t.token]={
token:t.token,
buyUsd:0,
sellUsd:0,
entry:0,
exit:0,
time:t.time
}
}

if(t.buyUsd){
positions[t.token].buyUsd += t.buyUsd
}

if(t.sellUsd){
positions[t.token].sellUsd += t.sellUsd
}

/* closed trade */
if(
positions[t.token].buyUsd>0 &&
positions[t.token].sellUsd>0
){

const p = positions[t.token]

const pnl = p.sellUsd - p.buyUsd
const pnlPercent =
(pnl / p.buyUsd) * 100

result.push({
symbol:p.token,
buyUsd:p.buyUsd,
sellUsd:p.sellUsd,
entry:(p.buyUsd/1000).toFixed(6),
exit:(p.sellUsd/1000).toFixed(6),
pnl,
pnlPercent,
time:p.time
})

delete positions[t.token]

}

}

/* latest first */
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
