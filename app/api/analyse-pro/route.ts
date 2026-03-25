import { NextRequest, NextResponse } from "next/server"
import axios from "axios"

// ============================
// PRICE CACHE
// ============================
const priceCache: Record<string, number> = {}

async function getTokenPrice(contract: string) {
if (priceCache[contract]) return priceCache[contract]

try {
const res = await axios.get(
`https://coins.llama.fi/prices/current/base:${contract}`
)

const price =
res.data.coins[`base:${contract}`]?.price || 0

priceCache[contract] = price
return price

} catch {
return 0
}
}

export async function POST(req: NextRequest) {

try {

const { wallet } = await req.json()
const address = wallet.toLowerCase()
const rpc = process.env.BASE_RPC!

// ============================
// FETCH TRANSFERS
// ============================
let transfers: any[] = []
let pageKey: string | undefined

const fetch = async (type: "fromAddress" | "toAddress") => {

pageKey = undefined

do {

const res = await axios.post(rpc, {
jsonrpc: "2.0",
id: 1,
method: "alchemy_getAssetTransfers",
params: [{
fromBlock: "0x0",
toBlock: "latest",
category: ["external", "erc20"],
withMetadata: true,
excludeZeroValue: true,
maxCount: "0x3e8",
pageKey,
[type]: address
}]
})

transfers = transfers.concat(res.data.result.transfers)
pageKey = res.data.result.pageKey

if (transfers.length > 8000) break

} while (pageKey)
}

await fetch("fromAddress")
await fetch("toAddress")

// ============================
// GROUP BY TX
// ============================
const txMap = new Map<string, any[]>()

for (const t of transfers) {

if (!txMap.has(t.hash)) txMap.set(t.hash, [])
txMap.get(t.hash)!.push(t)

}

// ============================
// ANALYSIS
// ============================
let swaps = 0
let volumeUSD = 0
let gas = 0
const days: Record<string, boolean> = {}

for (const [hash, txTransfers] of txMap) {

try {

// ============================
// DETECT SWAP (REAL)
// ============================
let sent: any[] = []
let received: any[] = []

for (const t of txTransfers) {

const value = Number(t.value || 0)
if (!value) continue

if (t.from?.toLowerCase() === address)
sent.push(t)

if (t.to?.toLowerCase() === address)
received.push(t)

}

if (sent.length === 0 || received.length === 0) continue

swaps++

// ============================
// REAL USD VOLUME
// ============================
let txVolume = 0

for (const t of [...sent, ...received]) {

const value = Number(t.value || 0)
if (!value) continue

const contract = t.rawContract?.address
if (!contract) continue

const price = await getTokenPrice(contract)

if (!price) continue

txVolume += value * price

}

volumeUSD += txVolume

// ============================
// GAS
// ============================
const receipt = await axios.post(rpc, {
jsonrpc: "2.0",
id: 1,
method: "eth_getTransactionReceipt",
params: [hash]
})

const gasUsed = parseInt(
receipt.data.result.gasUsed,
16
)

const gasPrice = parseInt(
receipt.data.result.effectiveGasPrice,
16
)

gas += (gasUsed * gasPrice) / 1e18

// ============================
// DAY
// ============================
const block = await axios.post(rpc, {
jsonrpc: "2.0",
id: 1,
method: "eth_getBlockByNumber",
params: [
receipt.data.result.blockNumber,
false
]
})

const ts = parseInt(
block.data.result.timestamp,
16
)

const day = new Date(ts * 1000)
.toISOString()
.split("T")[0]

days[day] = true

} catch { }

}

// ============================
// SCORE (REAL)
// ============================
const score =
(swaps * 8) +
(Object.keys(days).length * 4) +
(volumeUSD / 20) +
(gas * 2000)

// ============================
// RANK
// ============================
let rank = "#-"

if (score > 4000) rank = "##1"
else if (score > 2000) rank = "##2"
else if (score > 1000) rank = "##3"
else if (score > 500) rank = "##4"
else if (score > 100) rank = "##5"

return NextResponse.json({
swaps,
swapCount: swaps,
tradingVolumeUSD: Number(volumeUSD.toFixed(2)),
tradingDays: Object.keys(days).length,
tradingGas: Number(gas.toFixed(6)),
tradingGasETH: Number(gas.toFixed(6)),
score: Math.floor(score),
rank
})

} catch {

return NextResponse.json({
swaps: 0,
swapCount: 0,
tradingVolumeUSD: 0,
tradingDays: 0,
tradingGas: 0,
tradingGasETH: 0,
score: 0,
rank: "#-"
})

}
}
