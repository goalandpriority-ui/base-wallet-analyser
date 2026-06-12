import { NextRequest, NextResponse } from "next/server"
import axios from "axios"
import { getSupabase } from "@/lib/supabase"

export async function POST(req: NextRequest) {
  try {
    const supabase = getSupabase()
    const { wallet } = await req.json()

    if (!wallet) {
      return NextResponse.json({ error: "Wallet required" }, { status: 400 })
    }

    const address = wallet.toLowerCase().trim()
    let allTransfers: any[] = []

    const fetchTransfers = async (type: "fromAddress" | "toAddress") => {
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
              [type]: address,
            },
          ],
        })

        const result = res.data.result
        if (result?.transfers) {
          allTransfers = allTransfers.concat(result.transfers)
        }

        pageKey = result?.pageKey
        if (allTransfers.length > 10000) break
      } while (pageKey)
    }

    await fetchTransfers("fromAddress")
    await fetchTransfers("toAddress")

    // Group by tx hash to detect swaps
    const txMap = new Map<string, any[]>()
    for (const tx of allTransfers) {
      if (!txMap.has(tx.hash)) txMap.set(tx.hash, [])
      txMap.get(tx.hash)!.push(tx)
    }

    let swapCount = 0
    let volumeUSD = 0
    let tradingGas = 0
    const tradingDays: Record<string, boolean> = {}
    const STABLES = ["USDC", "USDT", "DAI", "USDB"]

    for (const [hash, transfers] of Array.from(txMap.entries())) {
      const sentAssets = new Set<string>()
      const receivedAssets = new Set<string>()

      for (const t of transfers) {
        const asset = (t.asset || "").toUpperCase()
        if (t.from?.toLowerCase() === address) sentAssets.add(asset)
        if (t.to?.toLowerCase() === address) receivedAssets.add(asset)
      }

      // A swap = sent one asset, received a different asset
      const isSwap =
        sentAssets.size > 0 &&
        receivedAssets.size > 0 &&
        [...sentAssets].some(a => !receivedAssets.has(a))

      if (!isSwap) continue

      swapCount++

      for (const t of transfers) {
        const value = Number(t.value || 0)
        const asset = (t.asset || "").toUpperCase()
        if (!value || !asset) continue

        if (t.from?.toLowerCase() === address) {
          if (STABLES.includes(asset)) volumeUSD += value
          if (asset === "ETH" || asset === "WETH") volumeUSD += value * 3000
        }
      }

      // Fetch gas for this swap tx
      try {
        const receipt = await axios.post(process.env.BASE_RPC!, {
          jsonrpc: "2.0",
          id: 1,
          method: "eth_getTransactionReceipt",
          params: [hash],
        })
        const r = receipt.data.result
        if (r) {
          const gasUsed = parseInt(r.gasUsed, 16)
          const gasPrice = parseInt(r.effectiveGasPrice, 16)
          tradingGas += (gasUsed * gasPrice) / 1e18
        }
      } catch {}

      const sample = transfers[0]
      if (sample?.metadata?.blockTimestamp) {
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

    // Save to leaderboard (upsert merges with basic analyse)
    await supabase.from("leaderboard").upsert(
      {
        wallet: address,
        score: Math.round(score),
        swapcount: swapCount,
        tradingvolumeusd: Math.round(volumeUSD),
        tradingdays: tradingDaysCount,
        tradinggaseth: Number(tradingGas.toFixed(6)),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "wallet" }
    )

    // Get rank
    const { count } = await supabase
      .from("leaderboard")
      .select("wallet", { count: "exact", head: true })
      .gt("score", Math.round(score))

    const rank = (count || 0) + 1

    return NextResponse.json({
      wallet: address,
      swaps: swapCount,
      swapCount,
      tradingVolumeUSD: Number(volumeUSD.toFixed(2)),
      tradingDays: tradingDaysCount,
      tradingGas: Number(tradingGas.toFixed(6)),
      tradingGasETH: Number(tradingGas.toFixed(6)),
      score: Math.round(score),
      rank,
    })

  } catch (err) {
    console.error("analyse-pro error", err)
    return NextResponse.json({ error: "Analysis failed" }, { status: 500 })
  }
}
