import { NextRequest, NextResponse } from "next/server"
import axios from "axios"

const RPC =
process.env.BASE_RPC ||
`https://base-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`

const rpc = axios.create({
baseURL: RPC,
timeout: 20000
})

// Known DEX routers
const DEX = [
"0x1111111254eeb25477b68fb85ed929f73a960582", // 0x
"0xdef1c0ded9bec7f1a1670819833240f027b25eff", // 0x alt
"0x327df1e6de05895d2ab08513aaDD9313Fe505d86", // Aerodrome
"0x1b02da8cb0d097eb8d57a175b88c7d8b47997506", // Uniswap
"0x2626664c2603336E57B271c5C0b26F421741e481" // BaseSwap
].map(x => x.toLowerCase())

export async function POST(req: NextRequest) {
try {

const { wallet } = await req.json()

// latest block
const latest = await rpc.post("",{
jsonrpc:"2.0",
id:1,
method:"eth_blockNumber",
params:[]
})

const toBlock = parseInt(latest.data.result,16)
const fromBlock = toBlock - 8000

// tx list
const logs = await rpc.post("",{
jsonrpc:"2.0",
id:1,
method:"eth_getLogs",
params:[{
fromBlock:"0x"+fromBlock.toString(16),
toBlock:"latest",
topics:[]
}]
})

let swaps = 0
let volume = 0
let gas = 0
let tradingDays = new Set()

for(const log of logs.data.result){

const address = log.address?.toLowerCase()

if(!DEX.includes(address)) continue

swaps++

const block = parseInt(log.blockNumber,16)

const blockRes = await rpc.post("",{
jsonrpc:"2.0",
id:1,
method:"eth_getBlockByNumber",
params:[log.blockNumber,false]
})

const ts = parseInt(blockRes.data.result.timestamp,16)
const day = Math.floor(ts / 86400)

tradingDays.add(day)

// fake volume estimate
volume += 50

// fake gas estimate
gas += 0.00005

}

return NextResponse.json({
swaps,
tradingVolume: volume,
tradingGas: gas,
tradingDays: tradingDays.size
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
