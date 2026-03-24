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
// ETH PRICE
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

if (allTransfers.length > 20000) break

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
let swaps = 0
let volumeUSD = 0
let tradingGas = 0
const tradingDays: Record<string, boolean> = {}

const STABLES = ["USDC","USDT","DAI","USDBC"]

for (const [hash, transfers] of txMap.entries()) {

let sent = 0
let received = 0
let txVolume = 0

for (const t of transfers) {

const asset = (t.asset || "").toUpperCase()
const value = Number(t.value || 0)

if (!value) continue

// sent
if (t.from?.toLowerCase() === address) {
sent++

if (STABLES.includes(asset)) {
txVolume += value
}

if (asset === "ETH" || asset === "WETH") {
txVolume += value * ETH_PRICE
}
}

// received
if (t.to?.toLowerCase() === address) {
received++
}

}

// =============================
// SWAP DETECT (FINAL)
// =============================
if (sent > 0 && received > 0) {

swaps++

volumeUSD += txVolume

const sample = transfers[0]

if (sample.metadata?.blockTimestamp) {
const day = new Date(sample.metadata.blockTimestamp)
.toISOString()
.split("T")[0]

tradingDays[day] = true
}

tradingGas += 0.00012

}

}

return NextResponse.json({
wallet,
swaps,
tradingVolumeUSD: Number(volumeUSD.toFixed(2)),
tradingDays: Object.keys(tradingDays).length,
tradingGas: Number(tradingGas.toFixed(6))
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
