import { NextRequest, NextResponse } from "next/server"
import axios from "axios"
import { getSupabase } from "../../../lib/supabase"

const api = axios.create({
  baseURL: "https://base.blockscout.com/api",
  timeout: 10000
})

// real token price map (Base major tokens)
const PRICE_MAP: Record<string, number> = {
  USDC: 1,
  USDT: 1,
  DAI: 1,
  WETH: 3500,
  ETH: 3500,
  CBETH: 3500,
  AERO: 1,
  DEGEN: 0.02
}

export async function POST(req: NextRequest) {

  try {

    const supabase = getSupabase()
    const { wallet } = await req.json()
    const address = wallet.toLowerCase()

    let page = 1
    let allTx: any[] = []

    // fetch more pages for accurate swaps
    while (page <= 15) {

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

      const decimals = Number(tx.tokenDecimal || 18)
      const value = Number(tx.value) / (10 ** decimals)

      const symbol = (tx.tokenSymbol || "").toUpperCase()

      const price = PRICE_MAP[symbol]

      // only count known tokens
      if (price && value > 0) {
        volumeUSD += value * price
      }

      // gas
      const gas =
        (Number(tx.gasUsed) * Number(tx.gasPrice)) / 1e18

      gasETH += gas

      // trading day
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
      wallet: "",
      swapCount: 0,
      tradingVolumeUSD: 0,
      tradingDays: 0,
      tradingGasETH: 0,
      score: 0,
      rank: 0,
      error: e.message || "Unknown error"
    }, { status: 500 })

  }
}
