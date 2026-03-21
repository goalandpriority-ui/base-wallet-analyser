import { NextRequest, NextResponse } from "next/server"
import axios from "axios"
import { getSupabase } from "../../../lib/supabase"

const rpc = axios.create({
  baseURL: process.env.BASE_RPC,
})

export async function POST(req: NextRequest) {

  try {

    const supabase = getSupabase()
    const { wallet } = await req.json()

    const address = wallet.toLowerCase()

    // get tx list
    const res = await rpc.post("", {
      jsonrpc: "2.0",
      id: 1,
      method: "alchemy_getAssetTransfers",
      params: [{
        fromBlock: "0x0",
        toBlock: "latest",
        fromAddress: address,
        category: ["external","internal","erc20"],
        withMetadata: true,
        maxCount: "0x3e8"
      }]
    })

    const transfers = res.data.result.transfers || []

    let swapCount = 0
    let volumeUSD = 0
    let gasETH = 0
    const tradingDays: Record<string, boolean> = {}

    for (const tx of transfers) {

      // detect swap via interaction
      if (tx.category === "erc20") {
        swapCount++

        const value = Number(tx.value || 0)
        const asset = (tx.asset || "").toUpperCase()

        if (asset === "USDC" || asset === "USDT") {
          volumeUSD += value
        }

        if (asset === "ETH" || asset === "WETH") {
          volumeUSD += value * 3000
        }
      }

      if (tx.metadata?.blockTimestamp) {
        const day = new Date(tx.metadata.blockTimestamp)
          .toISOString()
          .split("T")[0]

        tradingDays[day] = true
      }

      // gas
      const receipt = await rpc.post("", {
        jsonrpc:"2.0",
        id:1,
        method:"eth_getTransactionReceipt",
        params:[tx.hash]
      })

      const r = receipt.data.result

      if (r) {
        const gasUsed = parseInt(r.gasUsed,16)
        const gasPrice = parseInt(r.effectiveGasPrice,16)
        gasETH += (gasUsed * gasPrice) / 1e18
      }

    }

    const tradingDaysCount = Object.keys(tradingDays).length

    const score =
      (swapCount * 2) +
      tradingDaysCount +
      (volumeUSD / 100) +
      (gasETH * 5000)

    await supabase.from("leaderboard").insert({
      wallet: address,
      score,
      swaps: swapCount,
      volume: volumeUSD,
      days: tradingDaysCount,
      gas: gasETH
    })

    return NextResponse.json({
      wallet,
      swapCount,
      tradingVolumeUSD: volumeUSD,
      tradingDays: tradingDaysCount,
      tradingGasETH: gasETH,
      score: Math.round(score),
      rank: 1
    })

  } catch {

    return NextResponse.json({
      wallet:"",
      swapCount:0,
      tradingVolumeUSD:0,
      tradingDays:0,
      tradingGasETH:0,
      score:0,
      rank:0
    })

  }

}
