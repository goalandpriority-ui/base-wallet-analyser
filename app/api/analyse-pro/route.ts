import { NextRequest, NextResponse } from "next/server"
import axios from "axios"

const GRAPH_URL = "https://gateway.thegraph.com/api/public/subgraphs/id/9zvRrR7vRkNvztNFVQVw1Gc7YDxjx3sZHFVAb9YSEvum"

export async function POST(req: NextRequest) {
  try {
    const { wallet } = await req.json()

    if (!wallet) {
      return NextResponse.json({ error: "Wallet required" })
    }

    const address = wallet.toLowerCase()

    const twoYearsAgo =
      Math.floor(Date.now() / 1000) - (2 * 365 * 24 * 60 * 60)

    let allSwaps: any[] = []
    let skip = 0
    const limit = 100

    // 🔥 PAGINATION LOOP
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

      // 🔥 SAFETY LIMIT (avoid overload)
      if (skip > 2000) break
    }

    // 🔥 REMOVE DUPLICATES
    const map = new Map()

    for (const swap of allSwaps) {
      map.set(swap.id, swap)
    }

    const swaps = Array.from(map.values())

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
      period: "Last 2 Years (FULL PAGINATION)",
    })

  } catch (err) {
    console.error("GRAPH PAGINATION ERROR:", err)

    return NextResponse.json({
      error: "Pagination fetch failed",
    })
  }
}
