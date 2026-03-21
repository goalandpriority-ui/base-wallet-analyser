import { NextRequest, NextResponse } from "next/server"
import axios from "axios"
import { getSupabase } from "../../../lib/supabase"

const rpc = axios.create({
baseURL:
"https://base-mainnet.g.alchemy.com/v2/" +
process.env.ALCHEMY_API_KEY,
timeout:20000
})

const SWAP_METHODS = [
"0x38ed1739",
"0x18cbafe5",
"0x5c11d795",
"0x7ff36ab5",
"0x8803dbee",
"0x4a25d94a",
"0xfb3bdb41"
]

const ETH_PRICE = 3500

export async function POST(req:NextRequest){

try{

const supabase = getSupabase()
const {wallet} = await req.json()
const address = wallet.toLowerCase()

const res = await rpc.post("/",{
jsonrpc:"2.0",
id:1,
method:"alchemy_getAssetTransfers",
params:[{
fromBlock:"0x0",
toBlock:"latest",
fromAddress:address,
category:["external"],
withMetadata:true,
maxCount:"0x3e8"
}]
})

const txs = res.data.result.transfers || []

let swapCount=0
let volumeUSD=0
let gasETH=0

const tradingDays=new Set<string>()

for(const tx of txs){

const hash = tx.hash

const txData = await rpc.post("/",{
jsonrpc:"2.0",
id:1,
method:"eth_getTransactionByHash",
params:[hash]
})

const input =
txData.data.result?.input?.slice(0,10)

if(!SWAP_METHODS.includes(input))
continue

swapCount++

const value =
parseInt(txData.data.result.value,16)
/1e18

volumeUSD += value * ETH_PRICE

if(tx.metadata?.blockTimestamp){

const day =
new Date(tx.metadata.blockTimestamp)
.toISOString()
.split("T")[0]

tradingDays.add(day)
}

const receipt = await rpc.post("/",{
jsonrpc:"2.0",
id:1,
method:"eth_getTransactionReceipt",
params:[hash]
})

const r = receipt.data.result

const gas =
(parseInt(r.gasUsed,16) *
parseInt(r.effectiveGasPrice,16))
/1e18

gasETH += gas

}

const tradingDaysCount = tradingDays.size

const score =
swapCount*2 +
tradingDaysCount +
volumeUSD/100 +
gasETH*5000

await supabase
.from("leaderboard")
.upsert({
wallet:address,
score,
swaps:swapCount,
volume:volumeUSD,
days:tradingDaysCount,
gas:gasETH
},{onConflict:"wallet"})

return NextResponse.json({
wallet,
swapCount,
tradingVolumeUSD:Number(volumeUSD.toFixed(2)),
tradingDays:tradingDaysCount,
tradingGasETH:Number(gasETH.toFixed(6)),
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
