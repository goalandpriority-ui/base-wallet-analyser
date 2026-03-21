import { NextRequest, NextResponse } from "next/server"
import axios from "axios"

export async function POST(req: NextRequest) {
  try {
    const { wallet } = await req.json()

    if (!wallet) {
      return NextResponse.json({ error: "Wallet required" })
    }

    const address = wallet.toLowerCase()

    let allTransfers: any[] = []
    let pageKey: string | undefined = undefined

    // =========================================
    // 🔥 OUTGOING TRANSFERS
    // =========================================
    do {
      const res = await axios.post(process.env.BASE_RPC!, {
        jsonrpc: "2.0",
        id: 1,
        method: "alchemy_getAssetTransfers",
        params: [
          {
            fromBlock: "0x0",
            toBlock: "latest",
            category: ["external", "erc20"],
            withMetadata: true,
            excludeZeroValue: true,
            maxCount: "0x3e8",
            pageKey,
            fromAddress: address,
          },
        ],
      })

      const result = res.data.result

      if (result?.transfers) {
        allTransfers = allTransfers.concat(result.transfers)
      }

      pageKey = result.pageKey
      if (allTransfers.length > 5000) break

    } while (pageKey)

    // =========================================
    // 🔥 INCOMING TRANSFERS
    // =========================================
    pageKey = undefined

    do {
      const res = await axios.post(process.env.BASE_RPC!, {
        jsonrpc: "2.0",
        id: 1,
        method: "alchemy_getAssetTransfers",
        params: [
          {
            fromBlock: "0x0",
            toBlock: "latest",
            category: ["external", "erc20"],
            withMetadata: true,
            excludeZeroValue: true,
            maxCount: "0x3e8",
            pageKey,
            toAddress: address,
          },
        ],
      })

      const result = res.data.result

      if (result?.transfers) {
        allTransfers = allTransfers.concat(result.transfers)
      }

      pageKey = result.pageKey
      if (allTransfers.length > 10000) break

    } while (pageKey)

    // =========================================
    // 🔥 GROUP BY TX HASH
    // =========================================
    const txMap = new Map<string, any[]>()

    for (const tx of allTransfers) {
      const hash = tx.hash

      if (!txMap.has(hash)) {
        txMap.set(hash, [])
      }

      txMap.get(hash)!.push(tx)
    }

    // =========================================
    // 🔥 SWAP DETECT + USD VOLUME
    // =========================================
    let swapCount = 0
    let volumeUSD = 0
    const tradingDays: Record<string, boolean> = {}

    const STABLES = ["USDC", "USDT"]

    for (const entry of Array.from(txMap.entries())) {
      const transfers = entry[1]

      let sentAssets: string[] = []
      let receivedAssets: string[] = []

      for (const t of transfers) {
        const asset = (t.asset || "").toUpperCase()
        if (!asset) continue

        if (t.from?.toLowerCase() === address) {
          sentAssets.push(asset)
        }

        if (t.to?.toLowerCase() === address) {
          receivedAssets.push(asset)
        }
      }

      const uniqueSent = Array.from(new Set(sentAssets))
      const uniqueReceived = Array.from(new Set(receivedAssets))

      // =====================================
      // 🔥 SWAP CONDITION
      // =====================================
      if (
        uniqueSent.length > 0 &&
        uniqueReceived.length > 0 &&
        JSON.stringify(uniqueSent) !== JSON.stringify(uniqueReceived)
      ) {
        swapCount++

        // =====================================
        // 🔥 USD VOLUME CALCULATION
        // =====================================
        for (const t of transfers) {
          const value = Number(t.value || 0)
          const asset = (t.asset || "").toUpperCase()

          if (!value || !asset) continue

          if (t.from?.toLowerCase() === address) {

            // Stable coins → direct USD
            if (STABLES.includes(asset)) {
              volumeUSD += value
            }

            // ETH / WETH → convert USD
            if (asset === "ETH" || asset === "WETH") {
              volumeUSD += value * 3000 // rough ETH price
            }
          }
        }

        // =====================================
        // 🔥 ACTIVE TRADING DAY
        // =====================================
        const sample = transfers[0]
        if (sample.metadata?.blockTimestamp) {
          const day = new Date(sample.metadata.blockTimestamp)
            .toISOString()
            .split("T")[0]

          tradingDays[day] = true
        }
      }
    }

    // =========================================
    // 🔥 FINAL RESPONSE (IMPORTANT FIX)
    // =========================================
    return NextResponse.json({
      wallet,
      swapCount,
      tradingVolumeUSD: Number(volumeUSD.toFixed(2)), // 🔥 USE THIS IN UI
      tradingDays: Object.keys(tradingDays).length,
      source: "PRO FINAL 🔥",
    })

  } catch (err) {
    console.error("FINAL ERROR:", err)

    return NextResponse.json({
      error: "Analysis failed",
    })
  }
}
