import { NextRequest, NextResponse } from "next/server"
import axios from "axios"

const RPC =
"https://base-mainnet.g.alchemy.com/v2/" +
process.env.ALCHEMY_API_KEY

const BASE = [
"0x4200000000000000000000000000000000000006",
"0xd9aaec86b65d86f6a7b5c4120c3b4c0e5b2f0e73"
]

async function transfers(address:string){

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
address
}]
})

return res.data.result.transfers || []

}

export async function POST(req:NextRequest){

try{

const { wallet } = await req.json()
const address = wallet.toLowerCase()

const txs = await transfers(address)

/* group by hash */

const map:Record<string,any[]>={}

for(const t of txs){
if(!map[t.hash]) map[t.hash]=[]
map[t.hash].push(t)
}

const history:any[]=[]

for(const hash in map){

const group = map[hash]

let spent=0
let received=0

let tokenIn:any=null
let tokenOut:any=null

for(const tx of group){

const token =
tx.rawContract?.address?.toLowerCase()

const value = Number(tx.value||0)
if(!token || !value) continue

const from = tx.from?.toLowerCase()
const to = tx.to?.toLowerCase()

/* spent */
if(from===address && BASE.includes(token)){
spent+=value
}

/* received */
if(to===address && BASE.includes(token)){
received+=value
}

/* token buy */
if(to===address && !BASE.includes(token)){
tokenIn={
symbol:tx.asset || token.slice(0,6),
amount:value
}
}

/* token sell */
if(from===address && !BASE.includes(token)){
tokenOut={
symbol:tx.asset || token.slice(0,6),
amount:value
}
}

}

/* buy */
if(tokenIn && spent){

history.push({
symbol:tokenIn.symbol,
entry:spent,
exit:0,
amount:tokenIn.amount,
pnl:0
})

}

/* sell */
if(tokenOut && received){

const last =
history.reverse().find(
x=>x.symbol===tokenOut.symbol && x.exit===0
)

if(last){

last.exit = received
last.pnl = received - last.entry

}

}

}

return NextResponse.json(history.reverse())

}catch{

return NextResponse.json([])

}

}
