import { NextRequest, NextResponse } from "next/server"
import axios from "axios"
import { getSupabase } from "../../../lib/supabase"

const rpc = axios.create({
baseURL:
"https://base-mainnet.g.alchemy.com/v2/" +
process.env.ALCHEMY_API_KEY,
timeout:20000
})

/* swap topic */
const SWAP_TOPIC =
"0xd78ad95fa46c994b6551d0da85fc275fe613caa5f7e3a0f7e2e7bc01db57a2c9"

/* stablecoins */
const STABLES=["usdc","usdbc","usdt","dai"]

const MAX_SWAP=15000

export async function POST(req:NextRequest){

try{

const supabase=getSupabase()
const {wallet}=await req.json()

const address=wallet.toLowerCase()

/* transfers */
const res=await rpc.post("/",{
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

const txs=res.data.result.transfers || []

let swaps=0
let volume=0
let gas=0

const seen=new Set<string>()
const days=new Set<string>()

for(const tx of txs){

const hash=tx.hash
if(!hash) continue
if(seen.has(hash)) continue

seen.add(hash)

/* receipt */
const receipt=await rpc.post("/",{
jsonrpc:"2.0",
id:1,
method:"eth_getTransactionReceipt",
params:[hash]
})

const r=receipt.data.result
if(!r) continue

/* detect swap by topic */
let isSwap=false

for(const log of r.logs || []){

if(
log.topics &&
log.topics[0] &&
log.topics[0].toLowerCase() === SWAP_TOPIC
){
isSwap=true
break
}

}

if(!isSwap) continue

const symbol=(tx.asset || "").toLowerCase()
const amount=Number(tx.value || 0)

if(!amount) continue

/* ignore dust */
if(amount < 0.001) continue

let usd=0

if(STABLES.includes(symbol)){
usd=amount
}else{
continue
}

/* cap */
if(usd>MAX_SWAP) usd=MAX_SWAP

swaps++
volume+=usd

/* gas */
const g=
(parseInt(r.gasUsed,16)*
parseInt(r.effectiveGasPrice,16))
/1e18

gas+=g

/* days */
if(r.blockNumber){
const day=parseInt(r.blockNumber,16)
days.add(String(Math.floor(day/6500)))
}

}

const score =
swaps*5 +
volume/200 +
gas*3000

await supabase
.from("leaderboard")
.upsert({
wallet:address,
score,
swapcount:swaps,
tradingvolumeusd:volume,
tradingdays:days.size,
tradinggaseth:gas,
updated_at:new Date().toISOString()
},{onConflict:"wallet"})

/* rank */
const { data:all } = await supabase
.from("leaderboard")
.select("wallet,score")
.order("score",{ascending:false})

let rank=0

const i=all?.findIndex(
w=>w.wallet.toLowerCase()===address
)

if(i!==-1) rank=i+1

return NextResponse.json({
wallet,
swapCount:swaps,
tradingVolumeUSD:Number(volume.toFixed(2)),
tradingDays:days.size,
tradingGasETH:Number(gas.toFixed(6)),
score:Math.round(score),
rank
})

}catch(e){

return NextResponse.json({
wallet:"",
swapCount:0,
tradingVolumeUSD:0,
tradingDays:0,
tradingGasETH:0,
score:0,
rank:0
})

}
}
