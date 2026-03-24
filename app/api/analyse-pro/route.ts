import { NextRequest, NextResponse } from "next/server"
import axios from "axios"

const RPC =
process.env.BASE_RPC ||
`https://base-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`

const rpc = axios.create({
baseURL: RPC,
timeout: 20000
})

// DEX routers (Base)
const DEX = [
"0x1111111254eeb25477b68fb85ed929f73a960582", // 0x
"0xdef1c0ded9bec7f1a1670819833240f027b25eff",
"0x327df1e6de05895d2ab08513aaDD9313Fe505d86", // aerodrome
"0x1b02da8cb0d097eb8d57a175b88c7d8b47997506", // uniswap
"0x2626664c2603336e57b271c5c0b26f421741e481"  // baseswap
].map(x=>x.toLowerCase())

export async function POST(req: NextRequest){
try{

const { wallet } = await req.json()

// latest block
const latest = await rpc.post("",{
jsonrpc:"2.0",
id:1,
method:"eth_blockNumber",
params:[]
})

const toBlock = parseInt(latest.data.result,16)
const fromBlock = toBlock - 5000

// get txs (alchemy method)
const txs = await rpc.post("",{
jsonrpc:"2.0",
id:1,
method:"alchemy_getAssetTransfers",
params:[{
fromBlock:"0x"+fromBlock.toString(16),
toBlock:"latest",
fromAddress:wallet,
category:["external","erc20"]
}]
})

let swaps = 0
let volume = 0
let gas = 0
const days = new Set()

for(const tx of txs.data.result.transfers){

const to = tx.to?.toLowerCase()

if(!to) continue

if(DEX.includes(to)){
swaps++

volume += 100
gas += 0.0001

const day = Math.floor((tx.metadata.blockTimestamp
? new Date(tx.metadata.blockTimestamp).getTime()/1000
: Date.now()/1000)/86400)

days.add(day)
}

}

return NextResponse.json({
swaps,
tradingVolume:volume,
tradingGas:gas,
tradingDays:days.size
})

}catch(e){
return NextResponse.json({
swaps:0,
tradingVolume:0,
tradingGas:0,
tradingDays:0
})
}
}
