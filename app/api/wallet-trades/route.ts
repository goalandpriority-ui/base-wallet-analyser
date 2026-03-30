export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from "next/server"
import axios from "axios"

export async function POST(req: NextRequest) {

try {

const { wallet } = await req.json()
if (!wallet) return NextResponse.json([])

const address = wallet.toLowerCase()

const res = await axios.post(process.env.BASE_RPC!, {
jsonrpc: "2.0",
id: 1,
method: "alchemy_getAssetTransfers",
params: [{
fromBlock: "0x0",
toBlock: "latest",
category: ["erc20"],
withMetadata: true,
excludeZeroValue: true,
maxCount: "0x3e8",
fromAddress: address
}]
})

const transfers = res.data.result?.transfers || []

const trades = transfers.map((t:any)=>{

const value = Number(t.value || 0)

return {
symbol: t.asset || "TOKEN",
buyUsd: value,
sellUsd: 0,
entry: value,
exit: 0,
pnl: 0,
pnlPercent: 0,
time: t.metadata?.blockTimestamp
}

})

return NextResponse.json(trades.slice(0,30))

} catch (e) {

console.error(e)
return NextResponse.json([])

}

}
