import { NextRequest, NextResponse } from "next/server"
import axios from "axios"

const rpc = axios.create({
  baseURL:
    "https://base-mainnet.g.alchemy.com/v2/" +
    process.env.ALCHEMY_API_KEY,
  timeout: 20000
})

const COINGECKO =
"https://api.coingecko.com/api/v3/simple/token_price/base"

export async function POST(req: NextRequest) {

try{

const { wallet } = await req.json()
const address = wallet.toLowerCase()

let all:any[]=[]
let pageKey:any=undefined

/* OUT */
do{

const res = await rpc.post("/",{
jsonrpc:"2.0",
id:1,
method:"alchemy_getAssetTransfers",
params:[{
fromBlock:"0x0",
toBlock:"latest",
category:["erc20"],
withMetadata:true,
maxCount:"0x3e8",
pageKey,
fromAddress:address
}]
})

all = all.concat(res.data.result.transfers || [])
pageKey = res.data.result.pageKey

}while(pageKey)

pageKey=undefined

/* IN */
do{

const res = await rpc.post("/",{
jsonrpc:"2.0",
id:1,
method:"alchemy_getAssetTransfers",
params:[{
fromBlock:"0x0",
toBlock:"latest",
category:["erc20"],
withMetadata:true,
maxCount:"0x3e8",
pageKey,
toAddress:address
}]
})

all = all.concat(res.data.result.transfers || [])
pageKey = res.data.result.pageKey

}while(pageKey)

/* group tokens */

const tokens:Record<string,any>={}

for(const tx of all){

const token =
tx.rawContract?.address?.toLowerCase()

const symbol =
tx.asset ||
token?.slice(0,6) ||
"UNKNOWN"

const value = Number(tx.value || 0)
if(!value) continue

if(!tokens[token]){
tokens[token]={
symbol,
token,
buys:0,
sells:0,
buyAmount:0,
sellAmount:0,
holding:0,
volume:0,
trades:0
}
}

const from = tx.from?.toLowerCase()
const to = tx.to?.toLowerCase()

if(to===address){
tokens[token].buys++
tokens[token].buyAmount+=value
tokens[token].holding+=value
tokens[token].trades++
}

if(from===address){
tokens[token].sells++
tokens[token].sellAmount+=value
tokens[token].holding-=value
tokens[token].trades++
}

tokens[token].volume+=value
}

/* price fetch */

const addresses = Object.keys(tokens).join(",")

let prices:any={}
try{

const res = await axios.get(
`${COINGECKO}?contract_addresses=${addresses}&vs_currencies=usd`
)

prices = res.data

}catch{}

/* build list */

const list = Object.values(tokens)
.map((t:any)=>{

const price =
prices[t.token]?.usd || 0

const avgBuy =
t.buys ? t.buyAmount / t.buys : 0

const avgSell =
t.sells ? t.sellAmount / t.sells : 0

const realized =
t.sellAmount - (avgBuy * t.sells)

const unrealized =
t.holding * price

const pnl =
realized + unrealized

const positionValue =
t.holding * price

const winRate =
pnl > 0 ? 100 : 0

return{

symbol:t.symbol,
token:t.token,

buys:t.buys,
sells:t.sells,

avgBuy,
avgSell,

price,

holding:t.holding,
positionValue,

realized,
unrealized,
pnl,

volume:t.volume,
trades:t.trades,

winRate

}

})
.filter((t:any)=>t.volume>0)
.sort((a:any,b:any)=>b.volume-a.volume)
.slice(0,100)

return NextResponse.json(list)

}catch{

return NextResponse.json([])

}

}
