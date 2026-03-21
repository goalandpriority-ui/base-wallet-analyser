import { NextRequest, NextResponse } from "next/server"
import axios from "axios"
import { getSupabase } from "../../../lib/supabase"

const api = axios.create({
  baseURL: "https://base.blockscout.com/api",
  timeout: 10000
})

export async function POST(req: NextRequest) {

  try {

    const supabase = getSupabase()
    const { wallet } = await req.json()
    const address = wallet.toLowerCase()

    let page = 1
    let allTx: any[] = []

    // paginated fetch (accurate + safe)
    while (page <= 5) {

      const res = await api.get(
        `?module=account&action=tokentx&address=${address}&page=${page}&offset=100`
      )

      const txs = res.data.result || []

      if (txs.length === 0) break

      allTx = allTx.concat(txs)

      page++
    }

    const swapHashes = new Set<string>()

    let volumeUSD = 0
    let gasETH = 0

    const tradingDays = new Set<string>()

    for (const tx of allTx) {

      const hash = tx.hash
      swapHashes.add(hash)

      // volume
      const value = Number(tx.value) / 1e18

      if (tx.tokenSymbol === "USDC" || tx.tokenSymbol === "USDT") {
        volumeUSD += value
      }

      if (tx.tokenSymbol === "WETH" || tx.tokenSymbol === "ETH") {
        volumeUSD += value * 3500
      }

      // gas
      const gas =
        (Number(tx.gasUsed) * Number(tx.gasPrice)) / 1e18

      gasETH += gas

      // trading days
      const day =
        new Date(parseInt(tx.timeStamp) * 1000)
          .toISOString()
          .split("T")[0]

      tradingDays.add(day)
    }

    const swapCount = swapHashes.size
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

    console.error(e)

    return NextResponse.json({
      error: e.message
    }, { status: 500 })

  }
}
