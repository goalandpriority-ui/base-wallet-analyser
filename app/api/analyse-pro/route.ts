import { NextRequest, NextResponse } from "next/server"
import axios from "axios"
import { getSupabase } from "../../../lib/supabase"

const RPC = "https://mainnet.base.org"

const rpc = axios.create({
  baseURL: RPC,
  timeout: 10000
})

export async function POST(req: NextRequest) {
  try {

    const supabase = getSupabase()

    const { wallet } = await req.json()
    const address = wallet.toLowerCase()

    // ERC20 Transfer topic
    const TRANSFER_TOPIC =
      "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55aeb"

    const pad = (addr: string) =>
      "0x000000000000000000000000" + addr.replace("0x", "").toLowerCase()

    const logsFrom = await rpc.post("", {
      jsonrpc: "2.0",
      id: 1,
      method: "eth_getLogs",
      params: [{
        fromBlock: "0x0",
        toBlock: "latest",
        topics: [
          TRANSFER_TOPIC,
          pad(address)
        ]
      }]
    })

    const logsTo = await rpc.post("", {
      jsonrpc: "2.0",
      id: 1,
      method: "eth_getLogs",
      params: [{
        fromBlock: "0x0",
        toBlock: "latest",
        topics: [
          TRANSFER_TOPIC,
          null,
          pad(address)
        ]
      }]
    })

    const allLogs = [
      ...(logsFrom.data.result || []),
      ...(logsTo.data.result || [])
    ]

    const txHashes = [...new Set(allLogs.map((l:any)=>l.transactionHash))]

    let swapCount = txHashes.length
    let volumeUSD = swapCount * 50
    let gasETH = swapCount * 0.0003

    const tradingDays = new Set<string>()

    for (const log of allLogs) {
      if (log.blockNumber) {
        const day = parseInt(log.blockNumber,16)
        tradingDays.add(String(Math.floor(day/6500)))
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
      }, { onConflict: "wallet" })

    return NextResponse.json({
      wallet,
      swapCount,
      tradingVolumeUSD: volumeUSD,
      tradingDays: tradingDaysCount,
      tradingGasETH: gasETH,
      score: Math.round(score),
      rank: 1
    })

  } catch (e:any) {

    return NextResponse.json({
      error: e.message
    }, { status: 500 })

  }
}
