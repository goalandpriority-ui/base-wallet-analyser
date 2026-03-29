import { NextRequest, NextResponse } from "next/server"
import axios from "axios"

const RPC =
"https://base-mainnet.g.alchemy.com/v2/" +
process.env.ALCHEMY_API_KEY

export async function POST(req: NextRequest){

try{

const { wallet } = await req.json()
const address = wallet.toLowerCase()

/* get transfers */

const txs = await axios.post(RPC,{
jsonrpc:"2.0",
id:1,
method:"alchemy_getAssetTransfers",
params:[{
fromBlock:"0x0",
toBlock:"latest",
fromAddress:address,
category:["erc20"],
withMetadata:true,
maxCount:"0x3e8"
}]
})

const transfers = txs.data.result.transfers || []

const tokens:Record<string,any>={}

/* read swaps */

for(const t of transfers){

const hash = t.hash

const receipt = await axios.post(RPC,{
jsonrpc:"2.0",
id:1,
method:"eth_getTransactionReceipt",
params:[hash]
})

const logs = receipt.data.result?.logs || []

for(const log of logs){

const token = log.address.toLowerCase()

const raw = parseInt(log.data,16)
if(!raw || raw===0) continue

if(!tokens[token]){
tokens[token]={
token,
symbol:t.asset || token.slice(0,6),
buys:0,
sells:0,
buyAmount:0,
sellAmount:0,
holding:0,
trades:0,
lastBuy:0
}
}

const from = log.topics?.[1]
const to = log.topics?.[2]

/* buy */

if(to?.includes(address.slice(2))){

tokens[token].buys++
tokens[token].buyAmount+=raw
tokens[token].holding+=raw
tokens[token].lastBuy=raw
tokens[token].trades++

}

/* sell */

if(from?.includes(address.slice(2))){

tokens[token].sells++
tokens[token].sellAmount+=raw
tokens[token].holding-=raw
tokens[token].trades++

}

}

}

/* build pnl */

const list = Object.values(tokens)
.map((t:any)=>{

const entry =
t.buys ? t.buyAmount / t.buys : 0

const exit =
t.sells ? t.sellAmount / t.sells : 0

const realized =
t.sellAmount - (entry * t.sells)

const unrealized =
t.holding * entry

const pnl =
realized + unrealized

const winRate =
pnl > 0 ? 100 : 0

const copySignal =
t.buys > 2 &&
winRate > 60 &&
t.holding > 0

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

winRate,
copySignal

}

})
.filter((t:any)=>t.trades>1)
.sort((a:any,b:any)=>b.pnl-a.pnl)
.slice(0,100)

return NextResponse.json(list)

}catch{

return NextResponse.json([])

}

}
