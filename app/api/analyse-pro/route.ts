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
    const txMap: { [key: string]: any[] } = {}

    for (const tx of allTransfers) {
      const hash = tx.hash
      if (!txMap[hash]) txMap[hash] = []
      txMap[hash].push(tx)
    }

    // =========================================
    // 🔥 SWAP DETECT + REAL VOLUME
    // =========================================
    let swapCount = 0
    let swapVolumeUSD = 0
    const tradingDays: { [key: string]: boolean } = {}

    const STABLES = ["USDC", "USDT"]
    const ETH_PRICE = 3000 // rough

    for (const hash in txMap) {
      const transfers = txMap[hash]

      let sentAssets: string[] = []
      let receivedAssets: string[] = []

      let sentValueUSD = 0

      for (const t of transfers) {
        const value = Number(t.value || 0)
        const asset = (t.asset || "").toUpperCase()

        if (!value || !asset) continue

        // 🔴 SENT
        if (t.from?.toLowerCase() === address) {
          sentAssets.push(asset)

          if (STABLES.includes(asset)) {
            sentValueUSD += value
          } else if (asset === "ETH" || asset === "WETH") {
            sentValueUSD += value * ETH_PRICE
          } else {
            // 🔥 token estimate
            sentValueUSD += value * 0.5
          }
        }

        // 🟢 RECEIVED
        if (t.to?.toLowerCase() === address) {
          receivedAssets.push(asset)
        }
      }

      // unique (NO SET)
      const uniqueSent = sentAssets.filter((v, i, a) => a.indexOf(v) === i)
      const uniqueReceived = receivedAssets.filter((v, i, a) => a.indexOf(v) === i)

      // 🔥 SWAP CONDITION
      if (
        uniqueSent.length > 0 &&
        uniqueReceived.length > 0 &&
        JSON.stringify(uniqueSent) !== JSON.stringify(uniqueReceived)
      ) {
        swapCount++
        swapVolumeUSD += sentValueUSD

        const sample = transfers[0]
        if (sample.metadata?.blockTimestamp) {
          const day = new Date(sample.metadata.blockTimestamp)
            .toISOString()
            .split("T")[0]

          tradingDays[day] = true
        }
      }
    }

    return NextResponse.json({
      wallet,
      swapCount,
      tradingDays: Object.keys(tradingDays).length,
      tradingVolumeUSD: Number(swapVolumeUSD.toFixed(2)),
      source: "Transfer-based FINAL PRO 🔥",
    })

  } catch (err) {
    console.error("FINAL ERROR:", err)

    return NextResponse.json({
      error: "Analysis failed",
    })
  }
}
