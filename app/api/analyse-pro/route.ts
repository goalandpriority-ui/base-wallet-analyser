import { NextRequest, NextResponse } from "next/server"
import axios from "axios"
import { ethers } from "ethers"

const GRAPH_URL = "https://gateway.thegraph.com/api/public/subgraphs/id/9zvRrR7vRkNvztNFVQVw1Gc7YDxjx3sZHFVAb9YSEvum"

// 🔥 Base RPC
const provider = new ethers.JsonRpcProvider(process.env.BASE_RPC!)

// 🔥 Swap Topic
const SWAP_TOPIC = ethers.id("Swap(address,uint256,uint256,uint256,uint256,address)")

// 🔥 BASE DEX ROUTERS (VERY IMPORTANT)
const BASE_DEX_ROUTERS = [
  "0xcf77a3ba9a5ca399b7c97c74d54e5bf4a6a2b3bf", // Aerodrome
  "0x1111111254eeb25477b68fb85ed929f73a960582", // 1inch
  "0xdef1c0ded9bec7f1a1670819833240f027b25eff", // 0x
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
    // 🔥 GRAPH (UNCHANGED)
    // =========================================
    let allSwaps: any[] = []
    let skip = 0
    const limit = 100

    while (true) {
      const query = `
      {
        senderSwaps: swaps(first:${limit},skip:${skip},orderBy:timestamp,orderDirection:desc,where:{sender:"${address}",timestamp_gt:${twoYearsAgo}}){amountUSD timestamp id}
        recipientSwaps: swaps(first:${limit},skip:${skip},orderBy:timestamp,orderDirection:desc,where:{recipient:"${address}",timestamp_gt:${twoYearsAgo}}){amountUSD timestamp id}
      }
      `

      const res = await axios.post(GRAPH_URL, { query })

      if (!res.data || !res.data.data) break

      const batch = [
        ...(res.data.data.senderSwaps || []),
        ...(res.data.data.recipientSwaps || [])
      ]

      if (batch.length === 0) break

      allSwaps = allSwaps.concat(batch)
      skip += limit

      if (skip > 2000) break
    }

    const map = new Map()
    for (const s of allSwaps) map.set(s.id, s)
    const swaps = Array.from(map.values())

    if (swaps.length > 0) {
      let totalVolumeUSD = 0
      const daysSet = new Set<string>()

      for (const s of swaps) {
        totalVolumeUSD += Number(s.amountUSD)
        daysSet.add(new Date(s.timestamp * 1000).toISOString().split("T")[0])
      }

      return NextResponse.json({
        wallet,
        swapCount: swaps.length,
        totalVolumeUSD: Number(totalVolumeUSD.toFixed(2)),
        activeDays: daysSet.size,
        source: "Graph",
      })
    }

    // =========================================
    // 🔥 BASE PRO SYSTEM (MAIN FIX 🔥)
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
            category: ["external", "erc20"],
            withMetadata: true,
            maxCount: "0x3e8",
            pageKey,
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

      // 🔥 Active days
      if (tx.metadata?.blockTimestamp) {
        const day = new Date(tx.metadata.blockTimestamp)
          .toISOString()
          .split("T")[0]
        daysSet.add(day)
      }

      // 🔥 ROUTER DETECTION (MAIN LOGIC)
      if (tx.to && BASE_DEX_ROUTERS.includes(tx.to.toLowerCase())) {
        swapCount++

        if (tx.value) {
          const val = Number(tx.value)

          if (val > 0.00001 && val < 1000) {
            swapVolumeETH += val
          }
        }
      }
    }

    // =========================================
    // 🔥 EVENT BOOST (EXTRA ACCURACY)
    // =========================================

    const currentBlock = await provider.getBlockNumber()
    const fromBlock = currentBlock - 200000

    try {
      const logs = await provider.getLogs({
        fromBlock,
        toBlock: currentBlock,
        topics: [SWAP_TOPIC],
      })

      swapCount += logs.length
    } catch {}

    return NextResponse.json({
      wallet,
      swapCount,
      swapVolumeETH: Number(swapVolumeETH.toFixed(4)),
      activeDays: daysSet.size,
      source: "Base PRO 🔥",
      period: "Last 2 Years",
    })

  } catch (err) {
    console.error("FINAL ERROR:", err)

    return NextResponse.json({
      error: "Analysis failed",
    })
  }
      }
