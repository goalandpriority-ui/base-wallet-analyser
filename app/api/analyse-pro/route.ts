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

let transfers:any[] = []
let pageKey:any = undefined

do {

const res = await rpc.post("/", {
jsonrpc:"2.0",
id:1,
method:"alchemy_getAssetTransfers",
params:[{
fromBlock:"0x0",
toBlock:"latest",
category:["external","internal","erc20"],
withMetadata:true,
maxCount:"0x3e8",
pageKey,
fromAddress:address
}]
})

const result = res.data.result
transfers = transfers.concat(result.transfers || [])
pageKey = result.pageKey

} while (pageKey)


pageKey = undefined

do {

const res = await rpc.post("/", {
jsonrpc:"2.0",
id:1,
method:"alchemy_getAssetTransfers",
params:[{
fromBlock:"0x0",
toBlock:"latest",
category:["external","internal","erc20"],
withMetadata:true,
maxCount:"0x3e8",
pageKey,
toAddress:address
}]
})

const result = res.data.result
transfers = transfers.concat(result.transfers || [])
pageKey = result.pageKey

} while (pageKey)



const txMap:Record<string,any[]> = {}

for (const t of transfers) {
if (!txMap[t.hash]) txMap[t.hash] = []
txMap[t.hash].push(t)
}


let swapCount = 0
let volumeUSD = 0
let gasETH = 0

const tradingDays = new Set<string>()


for (const hash in txMap) {

const txs = txMap[hash]
if (txs.length < 2) continue

let hasIn = false
let hasOut = false
let txVolume = 0

for (const t of txs) {

const symbol = (t.asset || "").toUpperCase()
const value = Number(t.value || 0)

if (t.from?.toLowerCase() === address) {
hasOut = true
}

if (t.to?.toLowerCase() === address) {
hasIn = true
}

if (symbol === "ETH" || symbol === "WETH") {
txVolume += value * ETH_PRICE
}

if (STABLES.includes(symbol)) {
txVolume += value
}

if (t.metadata?.blockTimestamp) {

const day =
new Date(t.metadata.blockTimestamp)
.toISOString()
.split("T")[0]

tradingDays.add(day)
}

}

if (hasIn && hasOut) {
swapCount++
volumeUSD += txVolume
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
