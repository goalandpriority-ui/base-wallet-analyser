import { NextRequest, NextResponse } from "next/server"
import axios from "axios"

const SWAP_TOPIC =
"0xd78ad95fa46c994b6551d0da85fc275fe613d6e000000000000000000000000"

export async function POST(req: NextRequest) {
try {

const { wallet } = await req.json()
const address = wallet.toLowerCase()
const rpc = process.env.BASE_RPC!

// ============================
// ETH PRICE
// ============================
let ETH_PRICE = 3000

try{
const price = await axios.get(
"https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd"
)
ETH_PRICE = price.data.ethereum.usd
}catch{}

// ============================
// GET TX LIST
// ============================
let transfers: any[] = []
let pageKey: string | undefined

do {

const res = await axios.post(rpc,{
jsonrpc:"2.0",
id:1,
method:"alchemy_getAssetTransfers",
params:[{
fromBlock:"0x0",
toBlock:"latest",
fromAddress:address,
category:["external","erc20"],
withMetadata:true,
maxCount:"0x3e8",
pageKey
}]
})

transfers = transfers.concat(res.data.result.transfers)
pageKey = res.data.result.pageKey

if(transfers.length > 2000) break

} while(pageKey)

// ============================
// UNIQUE TX
// ============================
const hashes = [...new Set(transfers.map(t=>t.hash))]

// ============================
// ANALYSIS
// ============================
let swaps = 0
let volume = 0
let gas = 0
const days: Record<string,boolean> = {}

for(const hash of hashes){

try{

// receipt
const receipt = await axios.post(rpc,{
jsonrpc:"2.0",
id:1,
method:"eth_getTransactionReceipt",
params:[hash]
})

const logs = receipt.data.result.logs || []

// detect swap
const isSwap = logs.some((l:any)=>
l.topics?.[0]?.toLowerCase().startsWith("0xd78ad95f")
)

if(!isSwap) continue

swaps++

// gas
const gasUsed = parseInt(
receipt.data.result.gasUsed,
16
)

const gasPrice = parseInt(
receipt.data.result.effectiveGasPrice,
16
)

gas += (gasUsed * gasPrice)/1e18

// timestamp
const block = await axios.post(rpc,{
jsonrpc:"2.0",
id:1,
method:"eth_getBlockByNumber",
params:[
receipt.data.result.blockNumber,
false
]
})

const ts = parseInt(
block.data.result.timestamp,
16
)

const day = new Date(ts*1000)
.toISOString()
.split("T")[0]

days[day]=true

// volume estimate
volume += 15

}catch{}

}

// ============================
// SCORE
// ============================
const score =
(swaps*5)+
(Object.keys(days).length*3)+
(volume)+
(gas*1000)

// ============================
// RANK
// ============================
let rank="#-"

if(score>2000) rank="##1"
else if(score>1000) rank="##2"
else if(score>500) rank="##3"
else if(score>200) rank="##4"
else if(score>100) rank="##5"

return NextResponse.json({
swaps,
swapCount:swaps,
tradingVolumeUSD:Number(volume.toFixed(2)),
tradingDays:Object.keys(days).length,
tradingGas:Number(gas.toFixed(6)),
tradingGasETH:Number(gas.toFixed(6)),
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
