import { NextRequest, NextResponse } from "next/server"
import axios from "axios"

export async function POST(req: NextRequest) {
try {

const { wallet } = await req.json()

if (!wallet) {
return NextResponse.json({ error: "Wallet required" })
}

const address = wallet.toLowerCase()

let allTransfers: any[] = []
let pageKey: string | undefined = undefined

// =============================
// ETH PRICE (live)
// =============================
let ETH_PRICE = 3000

try{
const price = await axios.get(
"https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd"
)
ETH_PRICE = price.data.ethereum.usd || 3000
}catch{}

// =============================
// FETCH TRANSFERS
// =============================
const fetchTransfers = async (type: "fromAddress" | "toAddress") => {

pageKey = undefined

do {

const res = await axios.post(process.env.BASE_RPC!, {
jsonrpc: "2.0",
id: 1,
method: "alchemy_getAssetTransfers",
params: [
{
fromBlock: "0x0",
toBlock: "latest",
category: ["external", "erc20"],
withMetadata: true,
excludeZeroValue: true,
maxCount: "0x3e8",
pageKey,
[type]: address,
},
],
})

const result = res.data.result

if (result?.transfers) {
allTransfers = allTransfers.concat(result.transfers)
}

pageKey = result.pageKey

if (allTransfers.length > 15000) break

} while (pageKey)
}

await fetchTransfers("fromAddress")
await fetchTransfers("toAddress")

// =============================
// GROUP BY TX
// =============================
const txMap = new Map<string, any[]>()

for (const tx of allTransfers) {
if (!txMap.has(tx.hash)) {
txMap.set(tx.hash, [])
}
txMap.get(tx.hash)!.push(tx)
}

// =============================
// ANALYSIS
// =============================
let swapCount = 0
let volumeUSD = 0
let tradingGasETH = 0
const tradingDays: Record<string, boolean> = {}

const STABLES = [
"USDC",
"USDT",
"DAI",
"USDbC"
]

for (const [hash, transfers] of txMap.entries()) {

let sentAssets: string[] = []
let receivedAssets: string[] = []

let sentValueUSD = 0

for (const t of transfers) {

const asset = (t.asset || "").toUpperCase()
const value = Number(t.value || 0)

if (!value) continue

// sent
if (t.from?.toLowerCase() === address) {
sentAssets.push(asset)

if (STABLES.includes(asset)) {
sentValueUSD += value
}

if (asset === "ETH" || asset === "WETH") {
sentValueUSD += value * ETH_PRICE
}
}

// received
if (t.to?.toLowerCase() === address) {
receivedAssets.push(asset)
}

}

// remove duplicates
const uniqueSent = Array.from(new Set(sentAssets))
const uniqueReceived = Array.from(new Set(receivedAssets))

// =============================
// SWAP DETECT
// =============================
if (
uniqueSent.length > 0 &&
uniqueReceived.length > 0 &&
JSON.stringify(uniqueSent) !== JSON.stringify(uniqueReceived)
) {

swapCount++

volumeUSD += sentValueUSD

// trading day
const sample = transfers[0]

if (sample.metadata?.blockTimestamp) {
const day = new Date(sample.metadata.blockTimestamp)
.toISOString()
.split("T")[0]

tradingDays[day] = true
}

// approx gas
tradingGasETH += 0.00015
}

}

return NextResponse.json({
wallet,
swaps: swapCount,
tradingVolumeUSD: Number(volumeUSD.toFixed(2)),
tradingDays: Object.keys(tradingDays).length,
tradingGas: Number(tradingGasETH.toFixed(6))
})

} catch (err) {
console.error(err)

return NextResponse.json({
swaps:0,
tradingVolumeUSD:0,
tradingDays:0,
tradingGas:0
})
}
  }
