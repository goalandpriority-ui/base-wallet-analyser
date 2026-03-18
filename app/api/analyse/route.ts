import { NextRequest, NextResponse } from "next/server"
import axios from "axios"

const cache: Record<string, any> = {}

export async function POST(req: NextRequest) {
  try {
    const { wallet } = await req.json()

    if (!wallet) {
      return NextResponse.json({ error: "Wallet required" }, { status: 400 })
    }

    // 🔥 BASIC VALIDATION
    if (!wallet.startsWith("0x") || wallet.length !== 42) {
      return NextResponse.json({ error: "Invalid wallet address" }, { status: 400 })
    }

    // 🔥 CACHE (10 mins)
    const now = Date.now()
    if (cache[wallet] && now - cache[wallet].timestamp < 10 * 60 * 1000) {
      return NextResponse.json({
        ...cache[wallet].data,
        cached: true,
      })
    }

    // -------------------------
    // 🔥 TIME FILTER (LAST 2 YEARS)
    // -------------------------
    const twoYearsAgo = new Date()
    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2)

    // -------------------------
    // FETCH TRANSACTIONS
    // -------------------------
    const res = await axios.post(process.env.BASE_RPC!, {
      jsonrpc: "2.0",
      id: 1,
      method: "alchemy_getAssetTransfers",
      params: [
        {
          fromBlock: "0x0",
          toBlock: "latest",
          fromAddress: wallet,
          category: ["external", "erc20", "erc721"],
          withMetadata: true,
        },
      ],
    })

    const transfers = res.data.result.transfers || []

    let totalTxns = 0
    let totalVolumeETH = 0
    let totalGasETH = 0

    const daysSet = new Set<string>()

    for (const tx of transfers) {
      // -------------------------
      // 🔥 DATE FILTER
      // -------------------------
      if (tx.metadata?.blockTimestamp) {
        const txDate = new Date(tx.metadata.blockTimestamp)

        if (txDate < twoYearsAgo) continue

        const day = txDate.toISOString().split("T")[0]
        daysSet.add(day)
      }

      totalTxns++

      // -------------------------
      // 🔥 VOLUME FILTER (FINAL BALANCED 🔥)
      // -------------------------
      if (tx.value) {
        const value = Number(tx.value)

        // ❌ ignore dust
        if (value < 0.001) continue

        // ❌ ignore extreme unrealistic values
        if (value > 1000000) continue

        const asset = (tx.asset || "").toUpperCase()

        // 🔥 allow major assets only
        const allowedAssets = ["ETH", "WETH", "USDC", "USDT", "DAI"]

        if (!allowedAssets.includes(asset)) continue

        let normalizedValue = value

        // 🔥 convert stablecoins → ETH (approx)
        if (asset === "USDC" || asset === "USDT" || asset === "DAI") {
          normalizedValue = value / 3000
        }

        // 🔥 WETH treat as ETH
        if (asset === "WETH") {
          normalizedValue = value
        }

        totalVolumeETH += normalizedValue
      }

      // -------------------------
      // 🔥 GAS (same logic keep panniruken)
      // -------------------------
      totalGasETH += 0.0000025
    }

    const activeDays = daysSet.size

    const result = {
      wallet,
      totalTxns,
      totalVolumeETH: Number(totalVolumeETH.toFixed(4)),
      totalGasETH: Number(totalGasETH.toFixed(6)),
      activeDays,
      period: "Last 2 Years",
    }

    // 🔥 SAVE CACHE
    cache[wallet] = {
      data: result,
      timestamp: now,
    }

    return NextResponse.json(result)

  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
