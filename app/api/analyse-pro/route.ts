import { NextRequest, NextResponse } from "next/server"
import axios from "axios"
import { getSupabase } from "../../../lib/supabase"

const rpc = axios.create({
baseURL:
"https://base-mainnet.g.alchemy.com/v2/" +
process.env.ALCHEMY_API_KEY,
timeout:20000
})

const STABLES = ["usdc","usdbc","usdt","dai"]

/* BASE DEX ROUTERS */
const DEX = [
"0x327df1e6de05895d2ab08513aa-dd9313fe505d86", // aerodrome
"0x1111111254eeb25477b68fb85ed929f73a960582", // 0x
"0xdef1c0ded9bec7f1a1670819833240f027b25eff", // matcha
"0x3fc91a3afd70395cd496c647d5a6cc9d4b2b7fad", // uniswap
"0x5e325eda8064b456f4781070c0738d849c824258", // baseswap
"0x8cfe327cec66d1c090dd72bd0ff11d690c33a2eb"  // sushi
].map(a=>a.toLowerCase())

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

const days=new Set<string>()
const seen=new Set<string>()

for(const tx of txs){

const hash = tx.hash
if(!hash) continue
if(seen.has(hash)) continue

seen.add(hash)

/* check receipt */
const receipt=await rpc.post("/",{
jsonrpc:"2.0",
id:1,
method:"eth_getTransactionReceipt",
params:[hash]
})

const r=receipt.data.result
if(!r) continue

const to = (r.to || "").toLowerCase()

/* ONLY DEX swaps */
if(!DEX.includes(to)) continue

const symbol=(tx.asset||"").toLowerCase()
const amount = Number(tx.value || 0)

if(!amount) continue

let usd = 0

if(STABLES.includes(symbol)){
usd = amount
}else{
continue
}

/* cap whales */
if(usd > 20000) usd = 20000

swaps++
volume += usd

/* gas */
const g=
(parseInt(r.gasUsed,16)*
parseInt(r.effectiveGasPrice,16))
/1e18

gas+=g

if(r.blockNumber){
const day=parseInt(r.blockNumber,16)
days.add(String(Math.floor(day/6500)))
}

}

/* score */
const score =
swaps*5 +
volume/150 +
gas*3000

await supabase
.from("leaderboard")
.upsert({
wallet:address,
score:score,
swapcount:swaps,
tradingvolumeusd:volume,
tradingdays:days.size,
tradinggaseth:gas,
updated_at:new Date().toISOString()
},{onConflict:"wallet"})

/* calculate rank */
const { data:all } = await supabase
.from("leaderboard")
.select("wallet,score")
.order("score",{ascending:false})

let rank=1

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

}catch{

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
