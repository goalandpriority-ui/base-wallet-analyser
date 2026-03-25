import { NextRequest, NextResponse } from "next/server"
import axios from "axios"
import { createClient } from "@supabase/supabase-js"

const rpc = axios.create({
  baseURL: process.env.BASE_RPC,
  timeout: 10000
})

export async function POST(req: NextRequest) {
  try {

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { wallet } = await req.json()

    if (!wallet) {
      return NextResponse.json({ error: "Wallet required" })
    }

    const address = wallet.toLowerCase()

    let allTransfers: any[] = []
    let pageKey: string | undefined = undefined

    const fetchTransfers = async (type: "fromAddress" | "toAddress") => {
      pageKey = undefined

      do {
        const res = await rpc.post("", {
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

        if (allTransfers.length > 6000) break

      } while (pageKey)
    }

    await fetchTransfers("fromAddress")
    await fetchTransfers("toAddress")

    const txMap = new Map<string, any[]>()

    for (const tx of allTransfers) {
      if (!txMap.has(tx.hash)) {
        txMap.set(tx.hash, [])
      }
      txMap.get(tx.hash)!.push(tx)
    }

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

      // SAFE GAS (no freeze)
      try {
        const receipt = await rpc.post("", {
          jsonrpc: "2.0",
          id: 1,
          method: "eth_getTransactionReceipt",
          params: [hash]
        })

        if (receipt.data?.result) {
          const gasUsed = parseInt(
            receipt.data.result.gasUsed,
            16
          )

          const gasPrice = parseInt(
            receipt.data.result.effectiveGasPrice,
            16
          )

          tradingGas += (gasUsed * gasPrice) / 1e18
        }

      } catch {}

      const sample = transfers[0]

      if (sample.metadata?.blockTimestamp) {
        const day = new Date(sample.metadata.blockTimestamp)
          .toISOString()
          .split("T")[0]

        tradingDays[day] = true
      }
    }

    const tradingDaysCount = Object.keys(tradingDays).length

    const score =
      swapCount * 3 +
      volumeUSD * 0.01 +
      tradingDaysCount * 5

    await supabase
      .from("leaderboard")
      .upsert({
        wallet: address,
        score,
        swapcount: swapCount,
        tradingvolumeusd: volumeUSD,
        tradingdays: tradingDaysCount,
        tradinggaseth: tradingGas,
        updated_at: new Date()
      })

    const { data: better } = await supabase
      .from("leaderboard")
      .select("wallet")
      .gt("score", score)

    const rank = (better?.length || 0) + 1

    return NextResponse.json({
      wallet,
      swapCount,
      tradingVolumeUSD: Number(volumeUSD.toFixed(2)),
      tradingDays: tradingDaysCount,
      tradingGas: Number(tradingGas.toFixed(6)),
      tradingGasETH: Number(tradingGas.toFixed(6)),
      score: Math.round(score),
      rank
    })

  } catch (err) {
    console.error(err)
    return NextResponse.json({
      swapCount: 0,
      tradingVolumeUSD: 0,
      tradingDays: 0,
      tradingGas: 0,
      tradingGasETH: 0,
      score: 0,
      rank: "-"
    })
  }
}
