import { NextRequest, NextResponse } from "next/server"
import axios from "axios"

const RPC =
"https://base-mainnet.g.alchemy.com/v2/" +
process.env.ALCHEMY_API_KEY

const BASE = [
"0x4200000000000000000000000000000000000006",
"0xd9aaec86b65d86f6a7b5c4120c3b4c0e5b2f0e73"
]

async function fetchTransfers(address:string,type:"from"|"to"){

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
[type==="from"?"fromAddress":"toAddress"]:address
}]
})

return res.data.result.transfers || []

}

export async function POST(req:NextRequest){

try{

const { wallet } = await req.json()
const address = wallet.toLowerCase()

const out = await fetchTransfers(address,"from")
const incoming = await fetchTransfers(address,"to")

const all = [...out,...incoming]

/* group swaps */

const grouped:Record<string,any[]>={}

for(const tx of all){
if(!grouped[tx.hash]) grouped[tx.hash]=[]
grouped[tx.hash].push(tx)
}

const tokens:Record<string,any>={}

for(const hash in grouped){

const txs = grouped[hash]

let baseSpent=0
let baseReceived=0
let tokenBuy:any=null
let tokenSell:any=null

for(const tx of txs){

const token =
tx.rawContract?.address?.toLowerCase()

const value = Number(tx.value||0)

if(!token || !value) continue

const from = tx.from?.toLowerCase()
const to = tx.to?.toLowerCase()

/* base spent */
if(from===address && BASE.includes(token)){
baseSpent+=value
}

/* base received */
if(to===address && BASE.includes(token)){
baseReceived+=value
}

/* token buy */
if(to===address && !BASE.includes(token)){
tokenBuy={
token,
symbol:tx.asset || token.slice(0,6),
value
}
}

/* token sell */
if(from===address && !BASE.includes(token)){
tokenSell={
token,
symbol:tx.asset || token.slice(0,6),
value
}
}

}

/* BUY */

if(tokenBuy && baseSpent){

const t = tokenBuy.token

if(!tokens[t]){
tokens[t]={
symbol:tokenBuy.symbol,
buys:0,
sells:0,
buy:0,
sell:0,
holding:0
}
}

tokens[t].buys++
tokens[t].buy+=baseSpent
tokens[t].holding+=tokenBuy.value

}

/* SELL */

if(tokenSell && baseReceived){

const t = tokenSell.token

if(!tokens[t]){
tokens[t]={
symbol:tokenSell.symbol,
buys:0,
sells:0,
buy:0,
sell:0,
holding:0
}
}

tokens[t].sells++
tokens[t].sell+=baseReceived
tokens[t].holding-=tokenSell.value

}

}

const list = Object.values(tokens)
.map((t:any)=>{

const pnl = t.sell - t.buy

const winRate =
t.sells
? (t.sell > t.buy ? 100 : 0)
: 0

return{
symbol:t.symbol,
buys:t.buys,
sells:t.sells,
holding:t.holding,
pnl,
winRate
}

})
.sort((a:any,b:any)=>b.pnl-a.pnl)
.slice(0,50)

return NextResponse.json(list)

}catch{

return NextResponse.json([])

}

      }
