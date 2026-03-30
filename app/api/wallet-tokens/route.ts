import { NextRequest, NextResponse } from "next/server"
import axios from "axios"

const RPC =
"https://base-mainnet.g.alchemy.com/v2/" +
process.env.ALCHEMY_API_KEY

const BASE = [
"0x4200000000000000000000000000000000000006",
"0xd9aaec86b65d86f6a7b5c4120c3b4c0e5b2f0e73"
]

async function fetch(address:string){

const res = await axios.post(RPC,{
jsonrpc:"2.0",
id:1,
method:"alchemy_getAssetTransfers",
params:[{
fromBlock:"0x0",
toBlock:"latest",
category:["erc20"],
withMetadata:true,
maxCount:"0x3e8",
address:address
}]
})

return res.data.result.transfers || []
}

export async function POST(req:NextRequest){

try{

const { wallet } = await req.json()
const address = wallet.toLowerCase()

const transfers = await fetch(address)

/* group by tx */

const map:Record<string,any[]>={}

for(const t of transfers){
if(!map[t.hash]) map[t.hash]=[]
map[t.hash].push(t)
}

const trades:any[]=[]

for(const hash in map){

const txs = map[hash]

let spent=0
let received=0
let tokenIn:any=null
let tokenOut:any=null

for(const tx of txs){

const token =
tx.rawContract?.address?.toLowerCase()

const value = Number(tx.value||0)

if(!token || !value) continue

const from = tx.from?.toLowerCase()
const to = tx.to?.toLowerCase()

/* spent base */
if(from===address && BASE.includes(token)){
spent += value
}

/* received base */
if(to===address && BASE.includes(token)){
received += value
}

/* token in */
if(to===address && !BASE.includes(token)){
tokenIn = {
symbol:tx.asset || token.slice(0,6),
amount:value
}
}

/* token out */
if(from===address && !BASE.includes(token)){
tokenOut = {
symbol:tx.asset || token.slice(0,6),
amount:value
}
}

}

/* buy */
if(tokenIn && spent){
trades.push({
symbol:tokenIn.symbol,
type:"BUY",
price:spent,
amount:tokenIn.amount
})
}

/* sell */
if(tokenOut && received){
trades.push({
symbol:tokenOut.symbol,
type:"SELL",
price:received,
amount:tokenOut.amount
})
}

}

/* match */

const history:any[]=[]
const open:any={}

for(const t of trades){

if(t.type==="BUY"){
open[t.symbol]=t
continue
}

if(t.type==="SELL" && open[t.symbol]){

const buy=open[t.symbol]

history.push({
symbol:t.symbol,
entry:buy.price,
exit:t.price,
amount:t.amount,
pnl:t.price-buy.price
})

delete open[t.symbol]

}

}

return NextResponse.json(history.reverse())

}catch(e){

return NextResponse.json([])

}

}
