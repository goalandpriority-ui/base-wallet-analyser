import { NextRequest, NextResponse } from "next/server"
import axios from "axios"
import { getSupabase } from "../../../lib/supabase"

const rpc = axios.create({
  baseURL: "https://mainnet.base.org",
  timeout: 10000
})

const TRANSFER_TOPIC =
"0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55aeb"

const pad = (addr: string) =>
"0x000000000000000000000000" + addr.replace("0x","").toLowerCase()

export async function POST(req: NextRequest) {

try {

const supabase = getSupabase()
const { wallet } = await req.json()
const address = wallet.toLowerCase()

let allLogs:any[] = []

// last ~500k blocks மட்டும் scan
const latest = await rpc.post("",{
jsonrpc:"2.0",
id:1,
method:"eth_blockNumber",
params:[]
})

const latestBlock = parseInt(latest.data.result,16)
const startBlock = latestBlock - 500000

// chunk scan
for(let from=startBlock; from<latestBlock; from+=5000){

const to = Math.min(from+4999,latestBlock)

const logsFrom = await rpc.post("",{
jsonrpc:"2.0",
id:1,
method:"eth_getLogs",
params:[{
fromBlock:"0x"+from.toString(16),
toBlock:"0x"+to.toString(16),
topics:[TRANSFER_TOPIC,pad(address)]
}]
})

const logsTo = await rpc.post("",{
jsonrpc:"2.0",
id:1,
method:"eth_getLogs",
params:[{
fromBlock:"0x"+from.toString(16),
toBlock:"0x"+to.toString(16),
topics:[TRANSFER_TOPIC,null,pad(address)]
}]
})

allLogs.push(...(logsFrom.data.result||[]))
allLogs.push(...(logsTo.data.result||[]))

}

const txHashes = [...new Set(allLogs.map((l:any)=>l.transactionHash))]

const swapCount = txHashes.length
const volumeUSD = swapCount * 45
const gasETH = swapCount * 0.00025

const tradingDays = new Set<string>()

for(const log of allLogs){
if(log.blockNumber){
const d = parseInt(log.blockNumber,16)
tradingDays.add(String(Math.floor(d/6500)))
}
}

const tradingDaysCount = tradingDays.size

const score =
(swapCount * 2) +
tradingDaysCount +
(volumeUSD / 100) +
(gasETH * 5000)

await supabase
.from("leaderboard")
.upsert({
wallet: address,
score,
swaps: swapCount,
volume: volumeUSD,
days: tradingDaysCount,
gas: gasETH
},{onConflict:"wallet"})

return NextResponse.json({
wallet,
swapCount,
tradingVolumeUSD: volumeUSD,
tradingDays: tradingDaysCount,
tradingGasETH: gasETH,
score: Math.round(score),
rank:1
})

}catch(e:any){

return NextResponse.json({
error:e.message
},{status:500})

}
}
