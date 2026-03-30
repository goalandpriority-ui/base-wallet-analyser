import { NextRequest, NextResponse } from "next/server"
import axios from "axios"

const RPC =
"https://base-mainnet.g.alchemy.com/v2/" +
process.env.ALCHEMY_API_KEY

const BASE = [
"0x4200000000000000000000000000000000000006", // WETH
"0xd9aaec86b65d86f6a7b5c4120c3b4c0e5b2f0e73" // USDC
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

/* group by tx hash */

const grouped:Record<string,any[]>={}

for(const tx of all){
if(!grouped[tx.hash]) grouped[tx.hash]=[]
grouped[tx.hash].push(tx)
}

/* build trades */

const trades:any[] = []

for(const hash in grouped){

const txs = grouped[hash]

let baseSpent=0
let baseReceived=0

let tokenBuy:any=null
let tokenSell:any=null

for(const tx of txs){

const token =
tx.rawContract?.address?.toLowerCase()

const value = Number(tx.value || 0)
if(!token || !value) continue

const from = tx.from?.toLowerCase()
const to = tx.to?.toLowerCase()

/* base spent */

if(from===address && BASE.includes(token)){
baseSpent += value
}

/* base received */

if(to===address && BASE.includes(token)){
baseReceived += value
}

/* token buy */

if(to===address && !BASE.includes(token)){
tokenBuy = {
symbol: tx.asset || token.slice(0,6),
amount: value
}
}

/* token sell */

if(from===address && !BASE.includes(token)){
tokenSell = {
symbol: tx.asset || token.slice(0,6),
amount: value
}
}

}

/* BUY trade */

if(tokenBuy && baseSpent){

trades.push({
type:"BUY",
symbol:tokenBuy.symbol,
entry:baseSpent,
exit:0,
amount:tokenBuy.amount,
pnl:0
})

}

/* SELL trade */

if(tokenSell && baseReceived){

trades.push({
type:"SELL",
symbol:tokenSell.symbol,
entry:0,
exit:baseReceived,
amount:tokenSell.amount,
pnl:0
})

}

}

/* match buy sell */

const history:any[]=[]

const open:Record<string,any>={}

for(const t of trades){

if(t.type==="BUY"){
open[t.symbol]=t
continue
}

if(t.type==="SELL" && open[t.symbol]){

const buy = open[t.symbol]

const pnl = t.exit - buy.entry

history.push({
symbol:t.symbol,
entry:buy.entry,
exit:t.exit,
amount:t.amount,
pnl
})

delete open[t.symbol]

}

}

return NextResponse.json(history.reverse())

}catch{

return NextResponse.json([])

}

}
