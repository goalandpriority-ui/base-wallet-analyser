import { NextRequest, NextResponse } from "next/server"
import axios from "axios"
import { getSupabase } from "../../../lib/supabase"

const rpc = axios.create({
  baseURL: process.env.BASE_RPC,
})

export async function POST(req: NextRequest) {

  try {

    const supabase = getSupabase()
    const { wallet } = await req.json()

    const address = wallet.toLowerCase()

    // fetch sent transfers
    const resFrom = await rpc.post("", {
      jsonrpc: "2.0",
      id: 1,
      method: "alchemy_getAssetTransfers",
      params: [{
        fromBlock: "0x0",
        toBlock: "latest",
        fromAddress: address,
        category: ["external","internal","erc20"],
        withMetadata: true,
        maxCount: "0x3e8"
      }]
    })

    // fetch received transfers
    const resTo = await rpc.post("", {
      jsonrpc: "2.0",
      id: 1,
      method: "alchemy_getAssetTransfers",
      params: [{
        fromBlock: "0x0",
        toBlock: "latest",
        toAddress: address,
        category: ["external","internal","erc20"],
        withMetadata: true,
        maxCount: "0x3e8"
      }]
    })

    const transfers = [
      ...(resFrom.data.result.transfers || []),
      ...(resTo.data.result.transfers || [])
    ]

    // group by tx hash
    const txMap = new Map<string, any[]>()

    for (const tx of transfers) {
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

    for (const [txHash, txs] of txMap.entries()) {

      let sent = false
      let received = false

      for (const tx of txs) {

        if (tx.from?.toLowerCase() === address) {
          sent = true
        }

        if (tx.to?.toLowerCase() === address) {
          received = true
        }

        const asset = (tx.asset || "").toUpperCase()
        const value = Number(tx.value || 0)

        if (value && tx.from?.toLowerCase() === address) {

          if (asset === "USDC" || asset === "USDT") {
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

      // swap detect
      if (sent && received) {
        swapCount++

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
            const gasPrice = parseInt(r.effectiveGasPrice,16)
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

  } catch {

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
