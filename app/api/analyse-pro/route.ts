import { NextRequest, NextResponse } from "next/server"
import axios from "axios"
import { getSupabase } from "../../../lib/supabase"

const rpc = axios.create({
baseURL:
"https://base-mainnet.g.alchemy.com/v2/" +
process.env.ALCHEMY_API_KEY,
timeout:20000
})

const ETH_PRICE = 3500

/* SWAP ROUTERS */
const SWAP_ROUTERS = [

/* Uniswap */
"0x68b3465833fb72a70ecdf485e0e4c7bd8665fc45",

/* Aerodrome */
"0x420dd381b31aef6683db6b902084cb0ffece40da",

/* BaseSwap */
"0x327df1e6de05895d2ab08513aadd9313fe505d86",

/* Sushi */
"0x1b02da8cb0d097eb8d57a175b88c7d8b47997506",

/* Pancake */
"0x8cfe327cec66d1c090dd72bd0ff11d690c33a2eb",

/* Matcha / 0x */
"0xdef1c0ded9bec7f1a1670819833240f027b25eff",

/* OpenOcean */
"0x6352a56caadc4f1e25cd6c75970fa768a3304e64",

/* Kyber */
"0x6131b5fae19ea4f9d964eac0408e4408b66337b5"

]

export async function POST(req:NextRequest){

try{

const supabase=getSupabase()
const {wallet}=await req.json()
const address=wallet.toLowerCase()

const res=await rpc.post("/",{
jsonrpc:"2.0",
id:1,
method:"alchemy_getAssetTransfers",
params:[{
fromBlock:"0x0",
toBlock:"latest",
fromAddress:address,
category:["external"],
maxCount:"0x3e8"
}]
})

const txs=res.data.result.transfers || []

let swaps=0
let volume=0
let gas=0

const days=new Set<string>()

for(const tx of txs){

const receipt=await rpc.post("/",{
jsonrpc:"2.0",
id:1,
method:"alchemy_getTransactionReceipts",
params:[{
blockHash: tx.blockHash
}]
})

const receipts=
receipt.data.result.receipts || []

for(const r of receipts){

if(r.from?.toLowerCase()!==address)
continue

const to =
(r.to || "").toLowerCase()

const logs=r.logs || []

/* detect swap */
const isRouter =
SWAP_ROUTERS.includes(to)

const isSwap =
isRouter || logs.length >= 2

if(!isSwap) continue

swaps++

/* gas */
const g=
(parseInt(r.gasUsed,16)*
parseInt(r.effectiveGasPrice,16))
/1e18

gas+=g

/* volume */
const txValue =
parseInt(r.value || "0x0",16)/1e18

volume += txValue

/* active days */
if(r.blockNumber){
const day=parseInt(r.blockNumber,16)
days.add(String(Math.floor(day/6500)))
}

}

}

/* fallback volume from gas if zero */
if(volume === 0){
volume = gas * 10
}

/* USD */
const volumeUSD = volume * ETH_PRICE

const score=
swaps*2+
volumeUSD/100+
gas*5000

/* SAVE */
await supabase
.from("leaderboard")
.upsert({
wallet:address,
score,
swapCount:swaps,
tradingVolumeUSD:volumeUSD,
tradingDays:days.size,
tradingGasETH:gas,
updated_at:new Date().toISOString()
},{onConflict:"wallet"})

return NextResponse.json({
wallet,
swapCount:swaps,
tradingVolumeUSD:Number(volumeUSD.toFixed(2)),
tradingDays:days.size,
tradingGasETH:Number(gas.toFixed(6)),
score:Math.round(score),
rank:1
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
