import { NextRequest, NextResponse } from "next/server"
import axios from "axios"
import { getSupabase } from "../../../lib/supabase"

// 🔥 RPC SAFE (VERCEL FIX)
const RPC =
  process.env.BASE_RPC ||
  `https://base-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`

const rpc = axios.create({
  baseURL: RPC,
  timeout: 10000
})

export async function POST(req: NextRequest) {

  try {

    const supabase = getSupabase()
    const { wallet } = await req.json()

    const address = wallet.toLowerCase()

    let allTransfers:any[] = []
    let pageKey:any = undefined

    // fetch FROM
    do {
      const res = await rpc.post("", {
        jsonrpc: "2.0",
        id: 1,
        method: "alchemy_getAssetTransfers",
        params: [{
          fromBlock: "0x0",
          toBlock: "latest",
          category: ["external","internal","erc20"],
          withMetadata: true,
          maxCount: "0x3e8",
          pageKey,
          fromAddress: address
        }]
      })

      const result = res.data.result
      allTransfers = allTransfers.concat(result.transfers || [])
      pageKey = result.pageKey

    } while (pageKey)

    // fetch TO
    pageKey = undefined

    do {
      const res = await rpc.post("", {
        jsonrpc: "2.0",
        id: 1,
        method: "alchemy_getAssetTransfers",
        params: [{
          fromBlock: "0x0",
          toBlock: "latest",
          category: ["external","internal","erc20"],
          withMetadata: true,
          maxCount: "0x3e8",
          pageKey,
          toAddress: address
        }]
      })

      const result = res.data.result
      allTransfers = allTransfers.concat(result.transfers || [])
      pageKey = result.pageKey

    } while (pageKey)

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

    const STABLES = ["USDC","USDT"]

    for (const [txHash, txs] of txMap.entries()) {

      // 🔥 REAL SWAP DETECTION (UNISWAP / 1INCH / BASE)
      const txData = await rpc.post("", {
        jsonrpc:"2.0",
        id:1,
        method:"eth_getTransactionByHash",
        params:[txHash]
      })

      const input = txData.data.result?.input || ""

      const isSwap =
        input.startsWith("0x38ed1739") || // swapExactTokensForTokens
        input.startsWith("0x18cbafe5") || // swapExactETHForTokens
        input.startsWith("0x7ff36ab5") || // swapExactETHForTokens
        input.startsWith("0x5c11d795") || // uniswap v3
        input.startsWith("0x414bf389") || // multicall
        input.startsWith("0x3593564c") || // uniswap universal router
        input.startsWith("0x04e45aaf")    // uniswap v3 exactInput

      if (isSwap) {

        swapCount++

        for (const tx of txs) {

          const asset = (tx.asset || "").toUpperCase()
          const value = Number(tx.value || 0)

          if (value && tx.from?.toLowerCase() === address) {

            if (STABLES.includes(asset)) {
              volumeUSD += value
            }

            if (asset === "ETH" || asset === "WETH") {
              volumeUSD += value * 3000
            }
          }

          if (tx.metadata?.blockTimestamp) {
            const day = new Date(tx.metadata.blockTimestamp)
              .toISOString()
              .split("T")[0]

            tradingDays[day] = true
          }
        }

        if (!processedTx[txHash]) {

          processedTx[txHash] = true

          const receipt = await rpc.post("", {
            jsonrpc:"2.0",
            id:1,
            method:"eth_getTransactionReceipt",
            params:[txHash]
          })

          const r = receipt.data.result

          if (r) {
            const gasUsed = parseInt(r.gasUsed,16)
            const gasPrice = parseInt(r.effectiveGasPrice || "0x0",16)
            gasETH += (gasUsed * gasPrice) / 1e18
          }
        }
      }
    }

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

    return NextResponse.json({
      wallet,
      swapCount,
      tradingVolumeUSD: Number(volumeUSD.toFixed(2)),
      tradingDays: tradingDaysCount,
      tradingGasETH: Number(gasETH.toFixed(6)),
      score: Math.round(score),
      rank: 1
    })

  } catch (e:any) {

    console.log("analyse-pro error:", e?.response?.data || e)

    return NextResponse.json({
      wallet:"",
      swapCount:0,
      tradingVolumeUSD:0,
      tradingDays:0,
      tradingGasETH:0,
      score:0,
      rank:0
    })

  }

}
