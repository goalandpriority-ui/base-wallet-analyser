import { NextRequest, NextResponse } from "next/server"
import axios from "axios"
import { getSupabase } from "../../../lib/supabase"

const rpc = axios.create({
  baseURL:
    "https://base-mainnet.g.alchemy.com/v2/" +
    process.env.ALCHEMY_API_KEY,
  timeout: 20000
})

const ETH_PRICE = 3500
const STABLES = ["USDC","USDT","DAI"]

export async function POST(req: NextRequest) {

try {

const supabase = getSupabase()
const { wallet } = await req.json()
const address = wallet.toLowerCase()

const res = await rpc.post("/", {
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

let swapCount = 0
let volumeUSD = 0
let gasETH = 0

const tradingDays = new Set<string>()

for (const tx of txs) {

const hash = tx.hash

const receipt = await rpc.post("/", {
jsonrpc:"2.0",
id:1,
method:"eth_getTransactionReceipt",
params:[hash]
})

const r = receipt.data.result
if (!r) continue

const logs = r.logs || []

let tokenTransfers = 0
let txVolume = 0

for (const log of logs) {

if (!log.data) continue

// ERC20 transfer topic
if (
log.topics?.[0] ===
"0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55aeb"
) {

tokenTransfers++

const value =
parseInt(log.data,16) / 1e18

txVolume += value * ETH_PRICE
}

}

if (tokenTransfers >= 2) {

swapCount++
volumeUSD += txVolume

if (tx.metadata?.blockTimestamp) {

const day =
new Date(tx.metadata.blockTimestamp)
.toISOString()
.split("T")[0]

tradingDays.add(day)
}

const gas =
(parseInt(r.gasUsed,16) *
parseInt(r.effectiveGasPrice,16))
/1e18

gasETH += gas

}

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

} catch {

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
