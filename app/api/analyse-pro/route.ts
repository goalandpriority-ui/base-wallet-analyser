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
    // 🔥 OUTGOING
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
    // 🔥 INCOMING
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
    // 🔥 GROUP BY TX
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
    // 🔥 SWAP DETECT + VOLUME
    // =========================================
    let swapCount = 0
    let swapVolumeETH = 0
    const tradingDays = new Set<string>()

    const STABLES = ["USDC", "USDT"]
    const ETH_PRICE = 3000 // rough

    for (const entry of Array.from(txMap.entries())) {
      const transfers = entry[1]

      let sentTotal = 0
      let receivedTotal = 0

      let sentAssets: string[] = []
      let receivedAssets: string[] = []

      for (const t of transfers) {
        const value = Number(t.value || 0)
        const asset = (t.asset || "").toUpperCase()

        if (!value || !asset) continue

        if (t.from?.toLowerCase() === address) {
          sentTotal += value
          sentAssets.push(asset)
        }

        if (t.to?.toLowerCase() === address) {
          receivedTotal += value
          receivedAssets.push(asset)
        }
      }

      const uniqueSent = [...new Set(sentAssets)]
      const uniqueReceived = [...new Set(receivedAssets)]

      // 🔥 SWAP CONDITION
      if (
        sentTotal > 0 &&
        receivedTotal > 0 &&
        JSON.stringify(uniqueSent) !== JSON.stringify(uniqueReceived)
      ) {
        swapCount++

        // =====================================
        // 🔥 VOLUME LOGIC (REAL FIX)
        // =====================================
        for (const t of transfers) {
          const value = Number(t.value || 0)
          const asset = (t.asset || "").toUpperCase()

          if (!value || !asset) continue

          if (t.from?.toLowerCase() === address) {
            // ETH / WETH
            if (asset === "ETH" || asset === "WETH") {
              swapVolumeETH += value
            }

            // STABLE → convert
            if (STABLES.includes(asset)) {
              swapVolumeETH += value / ETH_PRICE
            }
          }
        }

        // =====================================
        // 🔥 ACTIVE DAY
        // =====================================
        const sample = transfers[0]
        if (sample.metadata?.blockTimestamp) {
          const day = new Date(sample.metadata.blockTimestamp)
            .toISOString()
            .split("T")[0]

          tradingDays.add(day)
        }
      }
    }

    return NextResponse.json({
      wallet,
      swapCount,
      swapVolumeETH: Number(swapVolumeETH.toFixed(4)),
      tradingDays: tradingDays.size,
      source: "Transfer-based PRO 🔥",
    })

  } catch (err) {
    console.error("FINAL ERROR:", err)

    return NextResponse.json({
      error: "Analysis failed",
    })
  }
}
