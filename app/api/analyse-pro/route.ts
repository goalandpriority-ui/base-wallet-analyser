import { NextRequest, NextResponse } from "next/server"
import axios from "axios"
import { getSupabase } from "@/lib/supabase"

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
    // 🔥 SWAP + VOLUME + GAS
    // =========================================
    let swapCount = 0
    let volumeUSD = 0
    let tradingGas = 0

    const tradingDays: Record<string, boolean> = {}

    const STABLES = ["USDC", "USDT"]

    for (const [hash, transfers] of Array.from(txMap.entries())) {

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

      const isSwap =
        uniqueSent.length > 0 &&
        uniqueReceived.length > 0 &&
        JSON.stringify(uniqueSent) !== JSON.stringify(uniqueReceived)

      if (!isSwap) continue

      swapCount++

      // =====================================
      // 🔥 VOLUME (UNCHANGED)
      // =====================================
      for (const t of transfers) {
        const value = Number(t.value || 0)
        const asset = (t.asset || "").toUpperCase()

        if (!value || !asset) continue

        if (t.from?.toLowerCase() === address) {

          if (STABLES.includes(asset)) {
            volumeUSD += value
          }

          if (asset === "ETH" || asset === "WETH") {
            volumeUSD += value * 3000
          }
        }
      }

      // =====================================
      // 🔥 TRADING GAS
      // =====================================
      try {

        const receipt = await axios.post(process.env.BASE_RPC!, {
          jsonrpc: "2.0",
          id: 1,
          method: "eth_getTransactionReceipt",
          params: [hash]
        })

        const gasUsed = parseInt(
          receipt.data.result.gasUsed,
          16
        )

        const gasPrice = parseInt(
          receipt.data.result.effectiveGasPrice,
          16
        )

        tradingGas += (gasUsed * gasPrice) / 1e18

      } catch {}

      // =====================================
      // 🔥 ACTIVE DAY
      // =====================================
      const sample = transfers[0]

      if (sample.metadata?.blockTimestamp) {
        const day = new Date(sample.metadata.blockTimestamp)
          .toISOString()
          .split("T")[0]

        tradingDays[day] = true
      }
    }

    // =====================================
    // 🔥 SCORE
    // =====================================
    const score =
      (swapCount * 5) +
      (volumeUSD * 0.5) +
      (Object.keys(tradingDays).length * 3) +
      (tradingGas * 20000)

    // =====================================
    // 🔥 SAVE TO SUPABASE
    // =====================================
    const supabase = getSupabase()

    await supabase
      .from("leaderboard")
      .upsert({
        wallet: address,
        score,
        swaps: swapCount,
        volume: volumeUSD,
        days: Object.keys(tradingDays).length,
        gas: tradingGas,
        updated_at: new Date().toISOString()
      })

    // =====================================
    // 🔥 GET GLOBAL RANK
    // =====================================
    const { data } = await supabase
      .from("leaderboard")
      .select("wallet,score")
      .order("score", { ascending: false })

    const rank =
      "#" +
      (data?.findIndex(
        (w: any) => w.wallet === address
      ) + 1)

    return NextResponse.json({
      wallet,
      swapCount,
      swaps: swapCount,
      tradingVolumeUSD: Number(volumeUSD.toFixed(2)),
      tradingDays: Object.keys(tradingDays).length,
      tradingGas: Number(tradingGas.toFixed(6)),
      tradingGasETH: Number(tradingGas.toFixed(6)),
      score: Math.floor(score),
      rank
    })

  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: "Analysis failed" })
  }
}
