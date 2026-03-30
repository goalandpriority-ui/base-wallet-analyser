import { NextRequest, NextResponse } from "next/server"
import axios from "axios"
import { getSupabase } from "@/lib/supabase"

export async function POST(req: NextRequest) {
  try {

    const supabase = getSupabase()

    const { wallet } = await req.json()

    if (!wallet) {
      return NextResponse.json({ error: "Wallet required" })
    }

    const address = wallet.toLowerCase().trim()

    let allTransfers: any[] = []
    let pageKey: string | undefined = undefined

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

      let sent: any[] = []
      let received: any[] = []

      for (const t of transfers) {

        const asset = (t.asset || "").toUpperCase()
        const value = Number(t.value || 0)

        if (!asset || !value) continue

        if (t.from?.toLowerCase() === address) {
          sent.push({ asset, value })
        }

        if (t.to?.toLowerCase() === address) {
          received.push({ asset, value })
        }
      }

      if (!sent.length || !received.length) continue

      /* pick biggest only (router noise remove) */
      const biggestSent = sent.sort((a,b)=>b.value-a.value)[0]
      const biggestRecv = received.sort((a,b)=>b.value-a.value)[0]

      /* ignore same token */
      if (biggestSent.asset === biggestRecv.asset) continue

      swapCount++

      /* volume calc */
      if (STABLES.includes(biggestSent.asset)) {
        volumeUSD += biggestSent.value
      }

      if (biggestSent.asset === "ETH" || biggestSent.asset === "WETH") {
        volumeUSD += biggestSent.value * 3000
      }

      try {
        const receipt = await axios.post(process.env.BASE_RPC!, {
          jsonrpc: "2.0",
          id: 1,
          method: "eth_getTransactionReceipt",
          params: [hash]
        })

        const gasUsed = parseInt(receipt.data.result.gasUsed, 16)
        const gasPrice = parseInt(receipt.data.result.effectiveGasPrice, 16)

        tradingGas += (gasUsed * gasPrice) / 1e18

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
      .delete()
      .eq("wallet", address)

    await supabase
      .from("leaderboard")
      .insert({
        wallet: address,
        score,
        swaps: swapCount,
        volume: volumeUSD,
        days: tradingDaysCount,
        gas: tradingGas,

        swapcount: swapCount,
        tradingvolumeusd: volumeUSD,
        tradingdays: tradingDaysCount,
        tradinggaseth: tradingGas,

        updated_at: new Date().toISOString()
      })

    const { data: better } = await supabase
      .from("leaderboard")
      .select("wallet")
      .gt("score", score)

    const rank = (better?.length || 0) + 1

    return NextResponse.json({
      wallet,
      swaps: swapCount,
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
    return NextResponse.json({ error: "Analysis failed" })
  }
}
