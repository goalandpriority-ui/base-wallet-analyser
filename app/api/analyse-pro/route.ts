import { NextRequest, NextResponse } from "next/server"
import axios from "axios"
import { ethers } from "ethers"

const GRAPH_URL = "https://gateway.thegraph.com/api/public/subgraphs/id/9zvRrR7vRkNvztNFVQVw1Gc7YDxjx3sZHFVAb9YSEvum"

// 🔥 Base RPC
const provider = new ethers.JsonRpcProvider(process.env.BASE_RPC!)

// 🔥 Swap event topic (Uniswap V2 style)
const SWAP_TOPIC = "0xd78ad95fa46c994b6551d0da85fc275fe613d1f7c7b5d2e0e5e8f7c6f6f6f6"

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
    // 🔥 GRAPH PAGINATION (UNCHANGED)
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
    // 🔥 GRAPH RESULT
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
    // 🔥 BASE EVENT DECODE (REAL FIX 🔥)
    // =========================================

    const currentBlock = await provider.getBlockNumber()

    // 🔥 scan last ~2M blocks (~Base history window)
    const fromBlock = currentBlock - 2_000_000

    const logs = await provider.getLogs({
      fromBlock,
      toBlock: currentBlock,
      topics: [SWAP_TOPIC],
    })

    let swapCount = 0
    let swapVolumeETH = 0
    const daysSet = new Set<string>()

    for (const log of logs) {
      try {
        const tx = await provider.getTransaction(log.transactionHash)

        if (!tx) continue

        // 🔥 only wallet related swaps
        if (
          tx.from.toLowerCase() !== address &&
          tx.to?.toLowerCase() !== address
        ) continue

        swapCount++

        // 🔥 decode swap values
        const decoded = ethers.AbiCoder.defaultAbiCoder().decode(
          ["uint256", "uint256", "uint256", "uint256"],
          log.data
        )

        const [a0in, a1in, a0out, a1out] = decoded

        const volume =
          Number(a0in) +
          Number(a1in) +
          Number(a0out) +
          Number(a1out)

        swapVolumeETH += volume / 1e18

        // 🔥 active trading day
        const block = await provider.getBlock(log.blockNumber)

        if (block?.timestamp) {
          const day = new Date(block.timestamp * 1000)
            .toISOString()
            .split("T")[0]

          daysSet.add(day)
        }

      } catch {
        continue
      }
    }

    return NextResponse.json({
      wallet,
      swapCount,
      swapVolumeETH: Number(swapVolumeETH.toFixed(4)),
      tradingDays: daysSet.size,
      source: "Base Event Decode 🔥",
      period: "Last ~2M blocks",
    })

  } catch (err) {
    console.error("FINAL ERROR:", err)

    return NextResponse.json({
      error: "Analysis failed",
    })
  }
}
