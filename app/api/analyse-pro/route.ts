import { NextRequest, NextResponse } from "next/server"
import axios from "axios"

const GRAPH_URL = "https://gateway.thegraph.com/api/public/subgraphs/id/9zvRrR7vRkNvztNFVQVw1Gc7YDxjx3sZHFVAb9YSEvum"

// 🔥 Base DEX Routers (Aerodrome etc.)
const BASE_DEX_ROUTERS = [
  "0xcf77a3ba9a5ca399b7c97c74d54e5bf4a6a2b3bf"
]

export async function POST(req: NextRequest) {
  try {
    const { wallet } = await req.json()

    if (!wallet) {
      return NextResponse.json({ error: "Wallet required" })
    }

    const address = wallet.toLowerCase()

    const twoYearsAgo =
      Math.floor(Date.now() / 1000) - (2 * 365 * 24 * 60 * 60)

    // =========================================
    // 🔥 GRAPH PAGINATION (UNCHANGED LOGIC)
    // =========================================
    let allSwaps: any[] = []
    let skip = 0
    const limit = 100

    while (true) {
      const query = `
      {
        senderSwaps: swaps(
          first: ${limit},
          skip: ${skip},
          orderBy: timestamp,
          orderDirection: desc,
          where: {
            sender: "${address}",
            timestamp_gt: ${twoYearsAgo}
          }
        ) {
          amountUSD
          timestamp
          id
        }

        recipientSwaps: swaps(
          first: ${limit},
          skip: ${skip},
          orderBy: timestamp,
          orderDirection: desc,
          where: {
            recipient: "${address}",
            timestamp_gt: ${twoYearsAgo}
          }
        ) {
          amountUSD
          timestamp
          id
        }
      }
      `

      const res = await axios.post(GRAPH_URL, { query })

      if (!res.data || !res.data.data) break

      const sender = res.data.data.senderSwaps || []
      const recipient = res.data.data.recipientSwaps || []

      const batch = [...sender, ...recipient]

      if (batch.length === 0) break

      allSwaps = allSwaps.concat(batch)

      skip += limit

      if (skip > 2000) break
    }

    // 🔥 REMOVE DUPLICATES
    const map = new Map()
    for (const swap of allSwaps) {
      map.set(swap.id, swap)
    }

    const swaps = Array.from(map.values())

    // =========================================
    // 🔥 IF GRAPH HAS DATA → RETURN
    // =========================================
    if (swaps.length > 0) {
      let totalVolumeUSD = 0
      const daysSet = new Set<string>()

      for (const swap of swaps) {
        totalVolumeUSD += Number(swap.amountUSD)

        const day = new Date(swap.timestamp * 1000)
          .toISOString()
          .split("T")[0]

        daysSet.add(day)
      }

      return NextResponse.json({
        wallet,
        swapCount: swaps.length,
        totalVolumeUSD: Number(totalVolumeUSD.toFixed(2)),
        activeDays: daysSet.size,
        source: "Graph (Ethereum)",
        period: "Last 2 Years",
      })
    }

    // =========================================
    // 🔥 BASE FALLBACK (NEW 🔥)
    // =========================================
    let allTransfers: any[] = []
    let pageKey: string | undefined = undefined

    do {
      const res = await axios.post(process.env.BASE_RPC!, {
        jsonrpc: "2.0",
        id: 1,
        method: "alchemy_getAssetTransfers",
        params: [
          {
            fromBlock: "0x0",
            toBlock: "latest",
            fromAddress: wallet,
            category: ["external"],
            withMetadata: true,
            maxCount: "0x3e8",
            pageKey: pageKey,
          },
        ],
      })

      const result = res.data.result

      if (result.transfers) {
        allTransfers = allTransfers.concat(result.transfers)
      }

      pageKey = result.pageKey

      if (allTransfers.length > 5000) break

    } while (pageKey)

    let swapCount = 0
    let swapVolumeETH = 0
    const daysSet = new Set<string>()

    for (const tx of allTransfers) {
      if (tx.metadata?.blockTimestamp) {
        const day = new Date(tx.metadata.blockTimestamp)
          .toISOString()
          .split("T")[0]
        daysSet.add(day)
      }

      if (tx.to && BASE_DEX_ROUTERS.includes(tx.to.toLowerCase())) {
        swapCount++

        if (tx.value) {
          const value = Number(tx.value)

          if (value > 0.0001 && value < 1000) {
            swapVolumeETH += value
          }
        }
      }
    }

    return NextResponse.json({
      wallet,
      swapCount,
      swapVolumeETH: Number(swapVolumeETH.toFixed(4)),
      activeDays: daysSet.size,
      source: "Base DEX (Fallback)",
      period: "Last 2 Years",
    })

  } catch (err) {
    console.error("FINAL ERROR:", err)

    return NextResponse.json({
      error: "Analysis failed",
    })
  }
}
