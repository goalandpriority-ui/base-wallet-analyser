import { NextRequest, NextResponse } from "next/server"
import axios from "axios"

export async function POST(req: NextRequest) {
try {

const { wallet } = await req.json()
const address = wallet.toLowerCase()
const rpc = process.env.BASE_RPC!

// ============================
// ETH PRICE
// ============================
let ETH_PRICE = 3000

try {
const price = await axios.get(
"https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd"
)
ETH_PRICE = price.data.ethereum.usd
} catch {}

// ============================
// FETCH TRANSFERS (IN + OUT)
// ============================
let transfers:any[]=[]
let pageKey:string|undefined

const fetch = async(type:"fromAddress"|"toAddress") => {

pageKey = undefined

do{

const res = await axios.post(rpc,{
jsonrpc:"2.0",
id:1,
method:"alchemy_getAssetTransfers",
params:[{
fromBlock:"0x0",
toBlock:"latest",
category:["external","erc20"],
withMetadata:true,
excludeZeroValue:true,
maxCount:"0x3e8",
pageKey,
[type]:address
}]
})

transfers = transfers.concat(res.data.result.transfers)
pageKey = res.data.result.pageKey

if(transfers.length>6000) break

}while(pageKey)

}

await fetch("fromAddress")
await fetch("toAddress")

// ============================
// GROUP BY TX
// ============================
const txMap = new Map<string,any[]>()

for(const t of transfers){
if(!txMap.has(t.hash)) txMap.set(t.hash,[])
txMap.get(t.hash)!.push(t)
}

// ============================
// ANALYSIS
// ============================
let swaps=0
let volumeUSD=0
let gas=0
const days:Record<string,boolean>={}

for(const [hash,txTransfers] of txMap){

try{

// receipt
const receipt = await axios.post(rpc,{
jsonrpc:"2.0",
id:1,
method:"eth_getTransactionReceipt",
params:[hash]
})

const logs = receipt.data.result.logs || []

// detect swap topic
const isSwap = logs.some((l:any)=>
l.topics?.[0]?.toLowerCase().startsWith("0xd78ad95f")
)

if(!isSwap) continue

// ============================
// REAL VOLUME
// ============================
let sentUSD=0
let receivedUSD=0

for(const t of txTransfers){

const asset=(t.asset||"").toUpperCase()
const value=Number(t.value||0)

if(!value) continue

// sent
if(t.from?.toLowerCase()===address){

if(asset==="USDC"||asset==="USDT"||asset==="DAI")
sentUSD+=value

if(asset==="ETH"||asset==="WETH")
sentUSD+=value*ETH_PRICE
}

// received
if(t.to?.toLowerCase()===address){

if(asset==="USDC"||asset==="USDT"||asset==="DAI")
receivedUSD+=value

if(asset==="ETH"||asset==="WETH")
receivedUSD+=value*ETH_PRICE
}

}

// must have both
if(sentUSD===0 || receivedUSD===0) continue

swaps++

const txVolume = Math.min(sentUSD,receivedUSD)
volumeUSD += txVolume

// ============================
// GAS
// ============================
const gasUsed = parseInt(
receipt.data.result.gasUsed,
16
)

const gasPrice = parseInt(
receipt.data.result.effectiveGasPrice,
16
)

gas += (gasUsed * gasPrice)/1e18

// ============================
// DAY
// ============================
const block = await axios.post(rpc,{
jsonrpc:"2.0",
id:1,
method:"eth_getBlockByNumber",
params:[
receipt.data.result.blockNumber,
false
]
})

const ts = parseInt(block.data.result.timestamp,16)

const day = new Date(ts*1000)
.toISOString()
.split("T")[0]

days[day] = true

}catch{}

}

// ============================
// SCORE
// ============================
const score =
(swaps*4)+
(Object.keys(days).length*2)+
(volumeUSD/50)+
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
wallet:address,
swaps,
swapCount:swaps,
tradingVolumeUSD:Number(volumeUSD.toFixed(2)),
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
