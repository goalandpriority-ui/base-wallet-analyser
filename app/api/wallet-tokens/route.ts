import { NextRequest, NextResponse } from "next/server"
import axios from "axios"

const RPC =
"https://base-mainnet.g.alchemy.com/v2/" +
process.env.ALCHEMY_API_KEY

export async function POST(req: NextRequest){

try{

const { wallet } = await req.json()
const address = wallet.toLowerCase()

/* OUTGOING */

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

/* INCOMING */

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

const tokens:Record<string,any>={}

for(const tx of all){

const token =
tx.rawContract?.address?.toLowerCase()

if(!token) continue

const value = Number(tx.value || 0)
if(!value || value===0) continue

if(!tokens[token]){
tokens[token]={
symbol:tx.asset || token.slice(0,6),
token,
buys:0,
sells:0,
buyAmount:0,
sellAmount:0,
holding:0,
trades:0
}
}

const from = tx.from?.toLowerCase()
const to = tx.to?.toLowerCase()

/* BUY */
if(to===address){
tokens[token].buys++
tokens[token].buyAmount+=value
tokens[token].holding+=value
tokens[token].trades++
}

/* SELL */
if(from===address){
tokens[token].sells++
tokens[token].sellAmount+=value
tokens[token].holding-=value
tokens[token].trades++
}

}

/* IMPORTANT FILTER */

const list =
Object.values(tokens)
.filter((t:any)=>

t.buys>0 &&      // must buy
t.sells>0 &&     // must sell
t.trades>1       // must trade

)
.map((t:any)=>{

const entry =
t.buyAmount / t.buys

const exit =
t.sellAmount / t.sells

const realized =
t.sellAmount - (entry * t.sells)

const unrealized =
t.holding * entry

const pnl =
realized + unrealized

const winRate =
pnl > 0 ? 100 :
pnl < 0 ? 0 : 50

return{

symbol:t.symbol,
token:t.token,

buys:t.buys,
sells:t.sells,

entryPrice:entry,
exitPrice:exit,

holding:t.holding,

realized,
unrealized,
pnl,

trades:t.trades,
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
