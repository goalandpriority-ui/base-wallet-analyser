import { NextRequest, NextResponse } from "next/server"
import axios from "axios"

export async function POST(req: NextRequest) {
try {

const { wallet } = await req.json()

if (!wallet) {
return NextResponse.json({ error: "Wallet required" })
}

const address = wallet.toLowerCase()
const rpc = process.env.BASE_RPC!

let allTransfers: any[] = []
let pageKey: string | undefined = undefined

// =============================
// ETH PRICE
// =============================
let ETH_PRICE = 3000

try {
const price = await axios.get(
"https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd"
)
ETH_PRICE = price.data.ethereum.usd
} catch {}

// =============================
// FETCH TRANSFERS
// =============================
const fetchTransfers = async (type: "fromAddress" | "toAddress") => {

pageKey = undefined

do {

const res = await axios.post(rpc,{
jsonrpc:"2.0",
id:1,
method:"alchemy_getAssetTransfers",
params:[
{
fromBlock:"0x0",
toBlock:"latest",
category:["external","erc20"],
withMetadata:true,
excludeZeroValue:true,
maxCount:"0x3e8",
pageKey,
[type]:address
}
]
})

const result = res.data.result

if(result?.transfers){
allTransfers = allTransfers.concat(result.transfers)
}

pageKey = result.pageKey

if(allTransfers.length > 10000) break

} while(pageKey)

}

await fetchTransfers("fromAddress")
await fetchTransfers("toAddress")

// =============================
// GROUP BY TX
// =============================
const txMap = new Map<string, any[]>()

for(const tx of allTransfers){
if(!txMap.has(tx.hash)){
txMap.set(tx.hash,[])
}
txMap.get(tx.hash)!.push(tx)
}

// =============================
// ANALYSIS
// =============================
let swaps = 0
let volumeUSD = 0
let tradingGas = 0
const tradingDays: Record<string,boolean> = {}

const STABLES = ["USDC","USDT","DAI","USDBC"]

for(const [hash, transfers] of txMap.entries()){

let sent = false
let received = false
let txVolume = 0

for(const t of transfers){

const asset = (t.asset || "").toUpperCase()
const value = Number(t.value || 0)

if(!value) continue

// sent
if(t.from?.toLowerCase() === address){
sent = true

if(STABLES.includes(asset)){
txVolume += value
}

if(asset === "ETH" || asset === "WETH"){
txVolume += value * ETH_PRICE
}
}

// received
if(t.to?.toLowerCase() === address){
received = true
}

}

// REAL SWAP DETECT
if(sent && received && txVolume > 1){

swaps++
volumeUSD += txVolume

const sample = transfers[0]

if(sample.metadata?.blockTimestamp){
const day = new Date(sample.metadata.blockTimestamp)
.toISOString()
.split("T")[0]

tradingDays[day] = true
}

// =============================
// REAL GAS
// =============================
try{

const receipt = await axios.post(rpc,{
jsonrpc:"2.0",
id:1,
method:"eth_getTransactionReceipt",
params:[hash]
})

const gasUsed = parseInt(
receipt.data.result.gasUsed,
16
)

const gasPrice = parseInt(
receipt.data.result.effectiveGasPrice,
16
)

const gasETH = (gasUsed * gasPrice) / 1e18

tradingGas += gasETH

}catch{}

}

}

// =============================
// SCORE
// =============================
const score =
(swaps * 3) +
(Object.keys(tradingDays).length * 2) +
(volumeUSD / 50) +
(tradingGas * 800)

// =============================
// RANK
// =============================
let rank = "#-"

if(score > 1000) rank = "#1"
else if(score > 500) rank = "#2"
else if(score > 200) rank = "#3"
else if(score > 100) rank = "#4"
else if(score > 50) rank = "#5"

return NextResponse.json({
wallet:address,
swaps,
swapCount:swaps,
tradingVolumeUSD:Number(volumeUSD.toFixed(2)),
tradingDays:Object.keys(tradingDays).length,
tradingGas:Number(tradingGas.toFixed(6)),
tradingGasETH:Number(tradingGas.toFixed(6)),
score:Math.floor(score),
rank
})

}catch(e){

return NextResponse.json({
swaps:0,
swapCount:0,
tradingVolumeUSD:0,
tradingDays:0,
tradingGas:0,
tradingGasETH:0,
score:0,
rank:"#-"
})

}
}
