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

    // 🔥 MULTI QUERY (FULL COVERAGE)
    const query = `
    {
      senderSwaps: swaps(
        first: 100,
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
        first: 100,
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

    if (!res.data || !res.data.data) {
      return NextResponse.json({ error: "No data from Graph" })
    }

    const senderSwaps = res.data.data.senderSwaps || []
    const recipientSwaps = res.data.data.recipientSwaps || []

    // 🔥 MERGE + REMOVE DUPLICATES
    const map = new Map()

    for (const swap of senderSwaps) {
      map.set(swap.id, swap)
    }

    for (const swap of recipientSwaps) {
      map.set(swap.id, swap)
    }

    const swaps = Array.from(map.values())

    let totalVolumeUSD = 0
    let swapCount = swaps.length

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
      swapCount,
      totalVolumeUSD: Number(totalVolumeUSD.toFixed(2)),
      activeDays: daysSet.size,
      period: "Last 2 Years (Full Tracking)",
    })

  } catch (err) {
    console.error("GRAPH ERROR:", err)

    return NextResponse.json({
      error: "Graph fetch failed",
    })
  }
}
