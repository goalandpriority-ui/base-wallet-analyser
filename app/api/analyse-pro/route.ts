import { NextRequest, NextResponse } from "next/server"
import axios from "axios"
import { getSupabase } from "../../../lib/supabase"

const rpc = axios.create({
baseURL:
"https://base-mainnet.g.alchemy.com/v2/" +
process.env.ALCHEMY_API_KEY,
timeout:20000
})

/* avg swap USD */
const AVG_SWAP_USD = 150

export async function POST(req:NextRequest){

try{

const supabase=getSupabase()
const {wallet}=await req.json()
const address=wallet.toLowerCase()

/* FETCH TRANSFERS */
const res=await rpc.post("/",{
jsonrpc:"2.0",
id:1,
method:"alchemy_getAssetTransfers",
params:[{
fromBlock:"0x0",
toBlock:"latest",
fromAddress:address,
category:["erc20","external"],
maxCount:"0x3e8"
}]
})

const txs=res.data.result.transfers || []

let swaps=0
let gas=0

const days=new Set<string>()
const seen=new Set<string>()

for(const tx of txs){

const hash = tx.hash
if(!hash) continue

/* avoid duplicate */
if(seen.has(hash)) continue

/* detect swap (token movement) */
if(tx.category==="erc20"){
swaps++
seen.add(hash)
}

/* gas */
try{

const receipt=await rpc.post("/",{
jsonrpc:"2.0",
id:1,
method:"eth_getTransactionReceipt",
params:[hash]
})

const r=receipt.data.result

if(r){

const g=
(parseInt(r.gasUsed,16)*
parseInt(r.effectiveGasPrice,16))
/1e18

gas+=g

/* active day */
if(r.blockNumber){
const day=parseInt(r.blockNumber,16)
days.add(String(Math.floor(day/6500)))
}

}

}catch{}

}

/* realistic volume */
const volume = swaps * AVG_SWAP_USD

/* score */
const score=
swaps*3+
volume/100+
gas*4000

/* SAVE */
await supabase
.from("leaderboard")
.upsert({
wallet:address,
score,
swapCount:swaps,
tradingVolumeUSD:volume,
tradingDays:days.size,
tradingGasETH:gas,
updated_at:new Date().toISOString()
},{onConflict:"wallet"})

return NextResponse.json({
wallet,
swapCount:swaps,
tradingVolumeUSD:Number(volume.toFixed(2)),
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
