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
    // 🔥 FETCH TRANSFERS (OUT + IN)
    // =========================================
    const fetchTransfers = async (type: "fromAddress" | "toAddress") => {
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
              [type]: address,
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
    }

    await fetchTransfers("fromAddress")
    await fetchTransfers("toAddress")

    // =========================================
    // 🔥 GROUP BY TX
    // =========================================
    const txMap = new Map<string, any[]>()

    for (const tx of allTransfers) {
      if (!txMap.has(tx.hash)) {
        txMap.set(tx.hash, [])
      }
      txMap.get(tx.hash)!.push(tx)
    }

    // =========================================
    // 🔥 SWAP + VOLUME
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

        if (t.from?.toLowerCase() === address) {
          sentAssets.push(asset)
        }

        if (t.to?.toLowerCase() === address) {
          receivedAssets.push(asset)
        }
      }

      const uniqueSent = Array.from(new Set(sentAssets))
      const uniqueReceived = Array.from(new Set(receivedAssets))

      if (
        uniqueSent.length > 0 &&
        uniqueReceived.length > 0 &&
        JSON.stringify(uniqueSent) !== JSON.stringify(uniqueReceived)
      ) {
        swapCount++

        for (const t of transfers) {
          let value = Number(t.value || 0)
          const asset = (t.asset || "").toUpperCase()
          const decimals = t.rawContract?.decimal ?? 18

          if (!value) continue

          // 🔥 FIX DECIMALS
          value = value / Math.pow(10, decimals)

          if (t.from?.toLowerCase() === address) {

            if (STABLES.includes(asset)) {
              volumeUSD += value
            }

            if (asset === "ETH" || asset === "WETH") {
              volumeUSD += value * 3000
            }
          }
        }

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
      tradingVolumeUSD: Number(volumeUSD.toFixed(2)),
      tradingDays: Object.keys(tradingDays).length,
    })

  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: "Analysis failed" })
  }
}
