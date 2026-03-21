import { NextRequest, NextResponse } from "next/server"
import axios from "axios"
import { getSupabase } from "../../../lib/supabase"

const rpc = axios.create({
  baseURL:
    "https://base-mainnet.g.alchemy.com/v2/" +
    process.env.ALCHEMY_API_KEY,
  timeout: 10000
})

const ETH_PRICE = 3500
const STABLES = ["USDC","USDT","DAI"]

export async function POST(req: NextRequest) {

  try {

    const supabase = getSupabase()
    const { wallet } = await req.json()
    const address = wallet.toLowerCase()

    let transfers: any[] = []

    const res = await rpc.post("/", {
      jsonrpc: "2.0",
      id: 1,
      method: "alchemy_getAssetTransfers",
      params: [{
        fromBlock: "0x0",
        toBlock: "latest",
        fromAddress: address,
        category: ["erc20"],
        withMetadata: true,
        maxCount: "0x3e8"
      }]
    })

    transfers = transfers.concat(
      res.data.result.transfers || []
    )

    const res2 = await rpc.post("/", {
      jsonrpc: "2.0",
      id: 1,
      method: "alchemy_getAssetTransfers",
      params: [{
        fromBlock: "0x0",
        toBlock: "latest",
        toAddress: address,
        category: ["erc20"],
        withMetadata: true,
        maxCount: "0x3e8"
      }]
    })

    transfers = transfers.concat(
      res2.data.result.transfers || []
    )

    const txMap: Record<string, any[]> = {}

    for (const t of transfers) {
      if (!txMap[t.hash]) txMap[t.hash] = []
      txMap[t.hash].push(t)
    }

    let swapCount = 0
    let volumeUSD = 0
    let gasETH = 0

    const tradingDays = new Set<string>()

    for (const hash in txMap) {

      const txs = txMap[hash]
      if (txs.length < 2) continue

      let txVolume = 0
      let isSwap = false

      for (const t of txs) {

        const symbol =
          (t.asset || "").toUpperCase()

        const value =
          Number(t.value || 0)

        if (symbol === "ETH" || symbol === "WETH") {
          txVolume += value * ETH_PRICE
          isSwap = true
        }

        if (STABLES.includes(symbol)) {
          txVolume += value
          isSwap = true
        }

        if (t.metadata?.blockTimestamp) {

          const day =
            new Date(t.metadata.blockTimestamp)
              .toISOString()
              .split("T")[0]

          tradingDays.add(day)
        }
      }

      if (isSwap) {
        swapCount++
        volumeUSD += txVolume
      }
    }

    const tradingDaysCount = tradingDays.size

    const score =
      (swapCount * 2) +
      tradingDaysCount +
      (volumeUSD / 100)

    await supabase
      .from("leaderboard")
      .upsert(
        {
          wallet: address,
          score,
          swaps: swapCount,
          volume: volumeUSD,
          days: tradingDaysCount,
          gas: gasETH
        },
        { onConflict: "wallet" }
      )

    return NextResponse.json({
      wallet,
      swapCount,
      tradingVolumeUSD: Number(volumeUSD.toFixed(2)),
      tradingDays: tradingDaysCount,
      tradingGasETH: Number(gasETH.toFixed(6)),
      score: Math.round(score),
      rank: 1
    })

  } catch (e: any) {

    return NextResponse.json({
      wallet: "",
      swapCount: 0,
      tradingVolumeUSD: 0,
      tradingDays: 0,
      tradingGasETH: 0,
      score: 0,
      rank: 0
    }, { status: 500 })

  }
}
