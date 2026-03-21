import { NextRequest, NextResponse } from "next/server"
import axios from "axios"
import { getSupabase } from "../../../lib/supabase"

const api = axios.create({
  baseURL: "https://base.blockscout.com/api",
  timeout: 8000
})

const ETH_PRICE = 3500
const STABLES = ["USDC","USDT","DAI"]

export async function POST(req: NextRequest) {

  try {

    const supabase = getSupabase()
    const { wallet } = await req.json()
    const address = wallet.toLowerCase()

    let page = 1
    let allTx: any[] = []

    // ⚡ reduce pages = faster
    while (page <= 8) {

      const res = await api.get(
        `?module=account&action=tokentx&address=${address}&page=${page}&offset=100`
      )

      const txs = res.data.result || []
      if (!txs.length) break

      allTx = allTx.concat(txs)
      page++
    }

    const txMap: Record<string, any[]> = {}

    for (const tx of allTx) {
      if (!txMap[tx.hash]) txMap[tx.hash] = []
      txMap[tx.hash].push(tx)
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

      for (const tx of txs) {

        const symbol =
          (tx.tokenSymbol || "").toUpperCase()

        const decimals =
          Number(tx.tokenDecimal || 18)

        const value =
          Number(tx.value) / (10 ** decimals)

        // ETH side
        if (symbol === "ETH" || symbol === "WETH") {
          txVolume += value * ETH_PRICE
          isSwap = true
        }

        // stable side
        if (STABLES.includes(symbol)) {
          txVolume += value
          isSwap = true
        }

        // gas
        const gas =
          (Number(tx.gasUsed) * Number(tx.gasPrice)) / 1e18

        gasETH += gas

        const day =
          new Date(parseInt(tx.timeStamp)*1000)
            .toISOString()
            .split("T")[0]

        tradingDays.add(day)
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
      (volumeUSD / 100) +
      (gasETH * 5000)

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
      rank: 0,
      error: e.message || "error"
    }, { status: 500 })

  }
}
