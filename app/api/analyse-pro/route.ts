import { NextRequest, NextResponse } from "next/server"
import axios from "axios"
import { getSupabase } from "../../../lib/supabase"

const rpc = axios.create({
  baseURL: process.env.BASE_RPC,
  timeout: 8000,
})

export async function POST(req: NextRequest) {
  try {
    const supabase = getSupabase()

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
        try {
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

        } catch {
          break
        }

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
    let gasETH = 0

    const tradingDays: Record<string, boolean> = {}
    const processedTx: Record<string, boolean> = {}

    const STABLES = ["USDC", "USDT"]

    const MAX_PARALLEL = 5
    let gasPromises: Promise<void>[] = []

    for (const [txHash, transfers] of txMap.entries()) {

      let sentAssets: string[] = []
      let receivedAssets: string[] = []

      for (const t of transfers) {
        const asset = (t.asset || "").toUpperCase()

        if (t.from?.toLowerCase() === address) {
          sentAssets.push(asset)

          const value = Number(t.value || 0)

          if (value) {
            if (STABLES.includes(asset)) volumeUSD += value
            if (asset === "ETH" || asset === "WETH") volumeUSD += value * 3000
          }
        }

        if (t.to?.toLowerCase() === address) {
          receivedAssets.push(asset)
        }

        // trading days (old logic)
        if (t.metadata?.blockTimestamp) {
          const day = new Date(t.metadata.blockTimestamp)
            .toISOString()
            .split("T")[0]

          tradingDays[day] = true
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

        if (!processedTx[txHash]) {
          processedTx[txHash] = true

          const promise = rpc.post("", {
            jsonrpc: "2.0",
            id: 1,
            method: "eth_getTransactionReceipt",
            params: [txHash],
          }).then(res => {

            const receipt = res.data.result

            if (receipt) {
              const gasUsed = parseInt(receipt.gasUsed, 16)
              const gasPrice = parseInt(receipt.effectiveGasPrice || "0x0", 16)
              gasETH += (gasUsed * gasPrice) / 1e18
            }

          }).catch(() => {})

          gasPromises.push(promise)

          if (gasPromises.length >= MAX_PARALLEL) {
            await Promise.all(gasPromises)
            gasPromises = []
          }
        }
      }
    }

    await Promise.all(gasPromises)

    const tradingDaysCount = Object.keys(tradingDays).length

    const score =
      (swapCount * 2) +
      tradingDaysCount +
      (volumeUSD / 100) +
      (gasETH * 5000)

    await supabase.from("leaderboard").insert({
      wallet: address,
      score,
      swaps: swapCount,
      volume: volumeUSD,
      days: tradingDaysCount,
      gas: gasETH
    })

    const last24h = new Date(
      Date.now() - 24 * 60 * 60 * 1000
    ).toISOString()

    const { count } = await supabase
      .from("leaderboard")
      .select("*", { count: "exact", head: true })
      .gt("score", score)
      .gte("created_at", last24h)

    const rank = (count || 0) + 1

    return NextResponse.json({
      wallet,
      swapCount,
      tradingVolumeUSD: Number(volumeUSD.toFixed(2)),
      tradingDays: tradingDaysCount,
      tradingGasETH: Number(gasETH.toFixed(6)),
      score: Math.round(score),
      rank
    })

  } catch (err) {
    return NextResponse.json({
      wallet: "",
      swapCount: 0,
      tradingVolumeUSD: 0,
      tradingDays: 0,
      tradingGasETH: 0,
      score: 0,
      rank: 0
    })
  }
}
