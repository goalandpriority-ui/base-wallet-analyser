import { NextRequest, NextResponse } from "next/server"
import axios from "axios"

// real swap events
const SWAP_TOPIC =
"0xd78ad95fa46c994b6551d0da85fc275fe613d6e000000000000000000000000"

const priceCache:Record<string,number>={}

async function getPrice(token:string){

if(priceCache[token]) return priceCache[token]

try{
const res=await axios.get(
`https://coins.llama.fi/prices/current/base:${token}`
)

const price=
res.data.coins[`base:${token}`]?.price || 0

priceCache[token]=price
return price

}catch{
return 0
}

}

export async function POST(req:NextRequest){

try{

const {wallet}=await req.json()
const address=wallet.toLowerCase()
const rpc=process.env.BASE_RPC!

// fetch tx list
let transfers:any[]=[]
let pageKey:string|undefined

do{

const res=await axios.post(rpc,{
jsonrpc:"2.0",
id:1,
method:"alchemy_getAssetTransfers",
params:[{
fromBlock:"0x0",
toBlock:"latest",
category:["external","erc20"],
withMetadata:true,
maxCount:"0x3e8",
pageKey,
fromAddress:address
}]
})

transfers=transfers.concat(res.data.result.transfers)
pageKey=res.data.result.pageKey

if(transfers.length>3000) break

}while(pageKey)

const hashes=[...new Set(transfers.map(t=>t.hash))]

let swaps=0
let volumeUSD=0
let gas=0
const days:Record<string,boolean>={}

for(const hash of hashes){

try{

const receipt=await axios.post(rpc,{
jsonrpc:"2.0",
id:1,
method:"eth_getTransactionReceipt",
params:[hash]
})

const logs=receipt.data.result.logs||[]

const swapLogs=logs.filter((l:any)=>
l.topics?.[0]?.toLowerCase().startsWith("0xd78ad95f")
)

if(!swapLogs.length) continue

swaps++

for(const log of swapLogs){

const token0=log.address
const amountHex=log.data.slice(2,66)

const amount=parseInt(amountHex,16)/1e18

const price=await getPrice(token0)

volumeUSD+=amount*price
}

// gas
const gasUsed=parseInt(
receipt.data.result.gasUsed,
16
)

const gasPrice=parseInt(
receipt.data.result.effectiveGasPrice,
16
)

gas+=(gasUsed*gasPrice)/1e18

// day
const block=await axios.post(rpc,{
jsonrpc:"2.0",
id:1,
method:"eth_getBlockByNumber",
params:[
receipt.data.result.blockNumber,
false
]
})

const ts=parseInt(
block.data.result.timestamp,
16
)

const day=new Date(ts*1000)
.toISOString()
.split("T")[0]

days[day]=true

}catch{}

}

// score real
const score=
(swaps*10)+
(Object.keys(days).length*5)+
(volumeUSD/10)+
(gas*2000)

let rank="#-"

if(score>4000) rank="##1"
else if(score>2000) rank="##2"
else if(score>1000) rank="##3"
else if(score>500) rank="##4"
else if(score>100) rank="##5"

return NextResponse.json({
swaps,
tradingVolumeUSD:Number(volumeUSD.toFixed(2)),
tradingDays:Object.keys(days).length,
tradingGas:Number(gas.toFixed(6)),
score:Math.floor(score),
rank
})

}catch{

return NextResponse.json({
swaps:0,
tradingVolumeUSD:0,
tradingDays:0,
tradingGas:0,
score:0,
rank:"#-"
})

}
}
