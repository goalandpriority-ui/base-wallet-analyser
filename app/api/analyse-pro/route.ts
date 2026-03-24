import { NextRequest, NextResponse } from "next/server"
import axios from "axios"

const RPC =
process.env.BASE_RPC ||
`https://base-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`

const rpc = axios.create({
baseURL: RPC,
timeout: 10000
})

// known base DEX routers
const DEX = [
"0x327Df1E6de05895d2ab08513aaDD9313Fe505d86", // uniswap
"0xcF77a3Ba9A5CA399B7c97c74d54e5b1F3F8c3F5e", // aerodrome
"0x1111111254EEB25477B68fb85Ed929f73A960582", // 1inch
"0xdef1c0ded9bec7f1a1670819833240f027b25eff", // 0x
].map(x => x.toLowerCase())

export async function POST(req: NextRequest) {

try{

const { wallet } = await req.json()
const address = wallet.toLowerCase()

// latest block
const latest = await rpc.post("",{
jsonrpc:"2.0",
method:"eth_blockNumber",
params:[],
id:1
})

const latestBlock = parseInt(latest.data.result,16)

const fromBlock = "0x" + (latestBlock - 50000).toString(16)

const txs = await rpc.post("",{
jsonrpc:"2.0",
method:"eth_getLogs",
params:[{
fromBlock,
toBlock:"latest",
topics:[
"0xddf252ad", // transfer
null,
"0x000000000000000000000000"+address.slice(2)
]
}],
id:1
})

let swaps = 0
let volume = 0
let tradingGas = 0
let days = new Set<string>()

for(const log of txs.data.result){

const tx = await rpc.post("",{
jsonrpc:"2.0",
method:"eth_getTransactionByHash",
params:[log.transactionHash],
id:1
})

const to = tx.data.result?.to?.toLowerCase()

if(!to) continue

// detect swap
if(DEX.includes(to)){

swaps++

const val = parseInt(tx.data.result.value || "0",16)/1e18
volume += val

const gas = parseInt(tx.data.result.gas || "0",16)
const gasPrice = parseInt(tx.data.result.gasPrice || "0",16)

tradingGas += (gas * gasPrice)/1e18

const block = await rpc.post("",{
jsonrpc:"2.0",
method:"eth_getBlockByNumber",
params:[tx.data.result.blockNumber,false],
id:1
})

const ts = parseInt(block.data.result.timestamp,16)*1000
const d = new Date(ts).toDateString()

days.add(d)

}

}

return NextResponse.json({
swaps,
tradingVolume: volume,
tradingGas,
tradingDays: days.size
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
