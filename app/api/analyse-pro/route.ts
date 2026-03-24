import { NextRequest, NextResponse } from "next/server"
import axios from "axios"

// RPC
const RPC =
process.env.BASE_RPC ||
`https://base-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`

const rpc = axios.create({
baseURL: RPC,
timeout: 20000
})

export async function POST(req: NextRequest){

try{

const { wallet } = await req.json()

if(!wallet){
return NextResponse.json({error:"No wallet"})
}

// get tx list (basescan)
const txRes = await axios.get(
`https://api.basescan.org/api?module=account&action=txlist&address=${wallet}&startblock=0&endblock=99999999&sort=desc`
)

const txs = txRes.data.result || []

const swapHashes = new Set<string>()
const tradingDays = new Set<string>()

let tradingVolume = 0
let tradingGas = 0

// limit to avoid rpc overload
const limited = txs.slice(0,150)

for(const tx of limited){

try{

const receiptRes = await rpc.post("",{
jsonrpc:"2.0",
id:1,
method:"eth_getTransactionReceipt",
params:[tx.hash]
})

const receipt = receiptRes.data.result
if(!receipt) continue

// ERC20 Transfer topic
const erc20Transfers = receipt.logs.filter((log:any)=>
log.topics[0] ===
"0xddf252ad00000000000000000000000000000000000000000000000000000000"
)

// swap = token in + token out
if(erc20Transfers.length >= 2){

swapHashes.add(tx.hash)

// volume (ETH)
const value =
parseInt(tx.value || "0x0",16) / 1e18

tradingVolume += value

// gas
const gas =
parseInt(receipt.gasUsed,16) *
parseInt(tx.gasPrice || "0x0",16) / 1e18

tradingGas += gas

// trading day
const day = new Date(
parseInt(tx.timeStamp) * 1000
).toDateString()

tradingDays.add(day)

}

}catch(e){
continue
}

}

// simple score
const score =
swapHashes.size * 2 +
tradingDays.size * 3 +
tradingVolume * 10

return NextResponse.json({

swaps: swapHashes.size,

tradingVolume:
Number(tradingVolume.toFixed(4)),

tradingGas:
Number(tradingGas.toFixed(6)),

tradingDays: tradingDays.size,

score: Math.floor(score)

})

}catch(e){

return NextResponse.json({
swaps:0,
tradingVolume:0,
tradingGas:0,
tradingDays:0,
score:0
})

}

}
