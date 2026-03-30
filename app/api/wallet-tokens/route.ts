import { NextRequest, NextResponse } from "next/server"
import axios from "axios"

const RPC =
"https://base-mainnet.g.alchemy.com/v2/" +
process.env.ALCHEMY_API_KEY

/* SWAP ROUTERS (BASE) */

const ROUTERS = [
"0xdef1c0ded9bec7f1a1670819833240f027b25eff", // 0x
"0x1111111254eeb25477b68fb85ed929f73a960582", // 1inch
"0x327df1e6de05895d2ab08513aa.dd9313fe505d86", // aerodrome
"0x420dd381b31aef6683db6b902084cb0ffece40da", // baseswap
"0x3fc91a3afd70395cd496c647d5a6cc9d4b2b7fad"  // farcaster swap
]

const BASE_TOKENS = [
"0x4200000000000000000000000000000000000006",
"0xd9aaec86b65d86f6a7b5c4120c3b4c0e5b2f0e73"
]

export async function POST(req: NextRequest){

try{

const { wallet } = await req.json()
const address = wallet.toLowerCase()

/* get transfers */

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
fromAddress:address
}]
})

const out = res.data.result.transfers || []

const res2 = await axios.post(RPC,{
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

const incoming = res2.data.result.transfers || []

const all = [...out,...incoming]

const tokens:Record<string,any>={}

for(const tx of all){

const token =
tx.rawContract?.address?.toLowerCase()

if(!token) continue

/* ignore base token */
if(BASE_TOKENS.includes(token)) continue

const value = Number(tx.value || 0)
if(!value) continue

const from = tx.from?.toLowerCase()
const to = tx.to?.toLowerCase()

/* detect swap only */

const routerMatch =
ROUTERS.includes(from) ||
ROUTERS.includes(to)

if(!routerMatch) continue

if(!tokens[token]){
tokens[token]={
symbol:tx.asset || token.slice(0,6),
token,
buys:0,
sells:0,
buyAmount:0,
sellAmount:0,
holding:0
}
}

/* buy */

if(to===address){
tokens[token].buys++
tokens[token].buyAmount+=value
tokens[token].holding+=value
}

/* sell */

if(from===address){
tokens[token].sells++
tokens[token].sellAmount+=value
tokens[token].holding-=value
}

}

/* calculate */

const list =
Object.values(tokens)
.filter((t:any)=>t.buys>0 && t.sells>0)
.map((t:any)=>{

const entry =
t.buyAmount / t.buys

const exit =
t.sellAmount / t.sells

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
.slice(0,30)

return NextResponse.json(list)

}catch{

return NextResponse.json([])

}

}
