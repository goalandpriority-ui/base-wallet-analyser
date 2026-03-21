import { NextRequest, NextResponse } from "next/server"
import axios from "axios"

export async function POST(req: NextRequest) {
  try {
    const { wallet } = await req.json()

    if (!wallet) {
      return NextResponse.json({ error: "Wallet required" })
    }

    const address = wallet.toLowerCase()

    // =========================================
    // 🔥 FETCH ALL TRANSFERS (OUTGOING)
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
    // 🔥 FETCH INCOMING TRANSFERS
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
    // 🔥 SWAP DETECTION
    // =========================================
    let swapCount = 0
    let swapVolumeETH = 0
    const tradingDays = new Set<string>()

    for (const entry of Array.from(txMap.entries())) {
      const hash = entry[0]
      const transfers = entry[1]

      let sent = 0
      let received = 0

      let sentAsset = ""
      let receivedAsset = ""

      for (const t of transfers) {
        const value = Number(t.value || 0)
        const asset = (t.asset || "").toUpperCase()

        if (t.from?.toLowerCase() === address) {
          sent += value
          sentAsset = asset
        }

        if (t.to?.toLowerCase() === address) {
          received += value
          receivedAsset = asset
        }
      }

      // 🔥 SWAP CONDITION
      if (sent > 0 && received > 0 && sentAsset !== receivedAsset) {
        swapCount++

        // 🔥 ETH volume calculation
        if (sentAsset === "ETH") {
          swapVolumeETH += sent
        }

        if (receivedAsset === "ETH") {
          swapVolumeETH += received
        }

        // 🔥 ACTIVE DAY
        const sample = transfers[0]
        if (sample.metadata?.blockTimestamp) {
          const day = new Date(sample.metadata.blockTimestamp)
            .toISOString()
            .split("T")[0]

          tradingDays.add(day)
        }
      }
    }

    // =========================================
    // 🔥 RESPONSE
    // =========================================
    return NextResponse.json({
      wallet,
      swapCount,
      swapVolumeETH: Number(swapVolumeETH.toFixed(4)),
      tradingDays: tradingDays.size,
      source: "Transfer-based detection 🔥",
    })

  } catch (err) {
    console.error("FINAL ERROR:", err)

    return NextResponse.json({
      error: "Analysis failed",
    })
  }
}
