import { NextRequest, NextResponse } from "next/server"
import axios from "axios"

const RPC =
"https://base-mainnet.g.alchemy.com/v2/" +
process.env.ALCHEMY_API_KEY

/* base tokens */
const BASE = [
"0x4200000000000000000000000000000000000006", // WETH
"0xd9aaec86b65d86f6a7b5c4120c3b4c0e5b2f0e73" // USDC
]

export async function POST(req:NextRequest){

try{

const { wallet } = await req.json()
const address = wallet.toLowerCase()

/* fetch outgoing */

const out = await axios.post(RPC,{
jsonrpc:"2.0",
id:1,
method:"alchemy_getAssetTransfers",
params:[{
fromBlock:"0x0",
toBlock:"latest",
category:["erc20"],
withMetadata:true,
maxCount:"0x3e8",
fromAddress:address
}]
})

/* fetch incoming */

const incoming = await axios.post(RPC,{
jsonrpc:"2.0",
id:1,
method:"alchemy_getAssetTransfers",
params:[{
fromBlock:"0x0",
toBlock:"latest",
category:["erc20"],
withMetadata:true,
maxCount:"0x3e8",
toAddress:address
}]
})

const all = [
...(out.data.result.transfers || []),
...(incoming.data.result.transfers || [])
]

/* group by hash (swap detection) */

const swaps:Record<string,any[]>={}

for(const tx of all){

const hash = tx.hash

if(!swaps[hash]) swaps[hash]=[]

swaps[hash].push(tx)

}

/* analyse swaps */

const tokens:Record<string,any>={}

for(const hash in swaps){

const txs = swaps[hash]

if(txs.length < 2) continue

let buyToken:any=null
let sellToken:any=null
let buyValue=0
let sellValue=0

for(const tx of txs){

const token =
tx.rawContract?.address?.toLowerCase()

if(!token) continue

const value = Number(tx.value || 0)
if(!value) continue

const from = tx.from?.toLowerCase()
const to = tx.to?.toLowerCase()

/* buy */
if(to===address && !BASE.includes(token)){
buyToken = token
buyValue = value
}

/* sell */
if(from===address && !BASE.includes(token)){
sellToken = token
sellValue = value
}

}

/* detect buy */

const token = buyToken || sellToken
const value = buyValue || sellValue

if(!token || !value) continue

if(!tokens[token]){
tokens[token]={
symbol:token.slice(0,6),
token,
buys:0,
sells:0,
buyAmount:0,
sellAmount:0,
holding:0
}
}

/* buy */

if(buyToken){
tokens[token].buys++
tokens[token].buyAmount+=buyValue
tokens[token].holding+=buyValue
}

/* sell */

if(sellToken){
tokens[token].sells++
tokens[token].sellAmount+=sellValue
tokens[token].holding-=sellValue
}

}

/* compute pnl */

const list = Object.values(tokens)
.map((t:any)=>{

const entry =
t.buys ? t.buyAmount/t.buys : 0

const exit =
t.sells ? t.sellAmount/t.sells : 0

const pnl =
t.sellAmount - (entry * t.sells)

const winRate =
pnl>0 ? 100 :
pnl<0 ? 0 : 50

return{
symbol:t.symbol,
buys:t.buys,
sells:t.sells,
holding:t.holding,
entry,
exit,
pnl,
winRate
}

})
.sort((a:any,b:any)=>b.pnl-a.pnl)
.slice(0,50)

return NextResponse.json(list)

}catch(e){

return NextResponse.json([])

}

  }
