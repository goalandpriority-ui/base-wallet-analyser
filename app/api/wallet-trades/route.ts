export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from "next/server"
import axios from "axios"

const STABLES = ["USDC","USDT","DAI"]
const ETH = ["ETH","WETH"]

const DEX = [
"0xdef1c0ded9bec7f1a1670819833240f027b25eff", // 0x
"0x1111111254eeb25477b68fb85ed929f73a960582", // 1inch
"0x327df1e6de05895d2ab08513aadd9313fe505d86", // aerodrome
"0x420dd381b31aef6683db6b902084cb0ffece40da", // baseswap
]

export async function POST(req: NextRequest){

try{

const { wallet } = await req.json()
if(!wallet) return NextResponse.json([])

const address = wallet.toLowerCase()

let transfers:any[]=[]
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
toAddress:address
}]
})

transfers = transfers.concat(res.data.result?.transfers || [])
pageKey = res.data.result?.pageKey

}while(pageKey)

/* group by tx */
const map = new Map<string,any[]>()

for(const t of transfers){
if(!map.has(t.hash)) map.set(t.hash,[])
map.get(t.hash)!.push(t)
}

const trades:any[]=[]

for(const [hash, txs] of map){

let buy:any=null
let sell:any=null

for(const t of txs){

const from = t.from?.toLowerCase()
const to = t.to?.toLowerCase()
const symbol = (t.asset || "").toUpperCase()
const value = Number(t.value || 0)

if(!value) continue

/* must be DEX */
if(DEX.includes(from)){
buy = {symbol, value}
}

if(DEX.includes(to)){
sell = {symbol, value}
}

}

/* real swap only */
if(!buy && !sell) continue

let token = ""
let buyUsd = 0
let sellUsd = 0

if(buy && !STABLES.includes(buy.symbol) && !ETH.includes(buy.symbol)){
token = buy.symbol
buyUsd = buy.value
}

if(sell && !STABLES.includes(sell.symbol) && !ETH.includes(sell.symbol)){
token = sell.symbol
sellUsd = sell.value
}

if(!token) continue

const pnl = sellUsd - buyUsd

trades.push({
symbol: token,
buyUsd,
sellUsd,
pnl,
time: txs[0]?.metadata?.blockTimestamp
})

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
