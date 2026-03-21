import { NextRequest, NextResponse } from "next/server"
import axios from "axios"
import { getSupabase } from "../../../lib/supabase"

const rpc = axios.create({
  baseURL: process.env.BASE_RPC,
  timeout: 10000
})

export async function POST(req: NextRequest) {

  try {

    const supabase = getSupabase()
    const { wallet } = await req.json()
    const address = wallet.toLowerCase()

    let allTransfers:any[] = []
    let pageKey:any = undefined

    // =========================
    // FETCH FROM
    // =========================
    do {
      const res = await rpc.post("", {
        jsonrpc:"2.0",
        id:1,
        method:"alchemy_getAssetTransfers",
        params:[{
          fromBlock:"0x0",
          toBlock:"latest",
          category:["external","internal","erc20","erc721","erc1155"],
          withMetadata:true,
          maxCount:"0x3e8",
          pageKey,
          fromAddress: address
        }]
      })

      const result = res.data.result
      allTransfers = allTransfers.concat(result.transfers || [])
      pageKey = result.pageKey

    } while(pageKey)


    // =========================
    // FETCH TO
    // =========================
    pageKey = undefined

    do {
      const res = await rpc.post("", {
        jsonrpc:"2.0",
        id:1,
        method:"alchemy_getAssetTransfers",
        params:[{
          fromBlock:"0x0",
          toBlock:"latest",
          category:["external","internal","erc20","erc721","erc1155"],
          withMetadata:true,
          maxCount:"0x3e8",
          pageKey,
          toAddress: address
        }]
      })

      const result = res.data.result
      allTransfers = allTransfers.concat(result.transfers || [])
      pageKey = result.pageKey

    } while(pageKey)


    // =========================
    // GROUP TX
    // =========================

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

    // =========================
    // ANALYSE
    // =========================

    for (const [txHash, txs] of txMap.entries()) {

      // fetch tx input
      const txData = await rpc.post("", {
        jsonrpc:"2.0",
        id:1,
        method:"eth_getTransactionByHash",
        params:[txHash]
      })

      const input = txData.data.result?.input || ""

      // router swap signatures
      const isSwapByInput =
        input.startsWith("0x38ed1739") ||
        input.startsWith("0x18cbafe5") ||
        input.startsWith("0x7ff36ab5") ||
        input.startsWith("0x5c11d795") ||
        input.startsWith("0x414bf389") ||
        input.startsWith("0x3593564c")

      // receipt logs check
      const receipt = await rpc.post("", {
        jsonrpc:"2.0",
        id:1,
        method:"eth_getTransactionReceipt",
        params:[txHash]
      })

      const logs = receipt.data.result?.logs || []

      let isSwapByLog = false

      for (const log of logs) {

        const topic = log.topics?.[0]?.toLowerCase()

        // Uniswap V2 / Aerodrome
        if (topic ===
          "0xd78ad95fa46c994b6551d0da85fc275fe613ce37657fb8d5e6a6b7e0a5eec8f3"
        ) {
          isSwapByLog = true
        }

        // Uniswap V3
        if (topic ===
          "0xc42079f94a6350d7e6235f29174924f928cc2ac818eb64fed8004e115fbcca67"
        ) {
          isSwapByLog = true
        }
      }

      const isSwap = isSwapByInput || isSwapByLog

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

  } catch (e) {

    console.log("analyse-pro error:", e)

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
