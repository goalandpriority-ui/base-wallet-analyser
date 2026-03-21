import { NextRequest, NextResponse } from "next/server"
import axios from "axios"
import { getSupabase } from "../../../lib/supabase"

const api = axios.create({
  baseURL: "https://base.blockscout.com/api",
  timeout: 8000
})

const ETH_PRICE = 3500

export async function POST(req: NextRequest) {

  try {

    const supabase = getSupabase()
    const { wallet } = await req.json()
    const address = wallet.toLowerCase()

    // fetch normal tx
    const normal = await api.get(
      `?module=account&action=txlist&address=${address}&page=1&offset=1000`
    )

    // fetch token tx
    const token = await api.get(
      `?module=account&action=tokentx&address=${address}&page=1&offset=1000`
    )

    const normalTx = normal.data.result || []
    const tokenTx = token.data.result || []

    const swapHashes = new Set<string>()

    let volumeUSD = 0
    let gasETH = 0

    const tradingDays = new Set<string>()

    // detect swaps from normal tx
    for (const tx of normalTx) {

      if (!tx.input || tx.input === "0x") continue

      // router swap detection
      if (
        tx.input.startsWith("0x38ed1739") ||
        tx.input.startsWith("0x18cbafe5") ||
        tx.input.startsWith("0x7ff36ab5") ||
        tx.input.startsWith("0x414bf389") ||
        tx.input.startsWith("0x5ae401dc")
      ) {
        swapHashes.add(tx.hash)
      }

      const gas =
        (Number(tx.gasUsed) * Number(tx.gasPrice)) / 1e18

      gasETH += gas

      const day =
        new Date(parseInt(tx.timeStamp)*1000)
          .toISOString()
          .split("T")[0]

      tradingDays.add(day)
    }

    // detect ETH volume
    for (const tx of tokenTx) {

      const symbol =
        (tx.tokenSymbol || "").toUpperCase()

      if (symbol === "WETH" || symbol === "ETH") {

        const decimals =
          Number(tx.tokenDecimal || 18)

        const value =
          Number(tx.value) / (10 ** decimals)

        volumeUSD += value * ETH_PRICE
      }
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
