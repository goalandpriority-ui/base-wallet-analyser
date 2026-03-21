import { NextRequest, NextResponse } from "next/server"
import axios from "axios"
import { getSupabase } from "../../../lib/supabase"

const rpc = axios.create({
baseURL:
"https://base-mainnet.g.alchemy.com/v2/" +
process.env.ALCHEMY_API_KEY,
timeout:20000
})

const ROUTERS = [
"0xcF77a3Ba9A5CA399B7c97c74d54e5B1cE3F9C2bB", // aerodrome
"0x1111111254EEB25477B68fb85Ed929f73A960582", // 1inch
"0xE592427A0AEce92De3Edee1F18E0157C05861564", // uniswap v3
"0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45"  // universal
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

const to =
tx.to?.toLowerCase()

if(!ROUTERS.includes(to))
continue

swapCount++

volumeUSD += Number(tx.value || 0) * ETH_PRICE

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
params:[tx.hash]
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
