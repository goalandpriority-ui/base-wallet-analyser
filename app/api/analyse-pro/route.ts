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

    if (!wallet) {
      return NextResponse.json({ error: "Wallet required" })
    }

    const address = wallet.toLowerCase()

    let allTransfers:any[] = []
    let pageKey:any = undefined

    // =========================================
    // FETCH OUTGOING
    // =========================================
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
          excludeZeroValue: true,
          maxCount: "0x3e8",
          pageKey,
          fromAddress: address
        }]
      })

      const result = res.data.result

      if (result?.transfers) {
        allTransfers = allTransfers.concat(result.transfers)
      }

      pageKey = result.pageKey

      if (allTransfers.length > 15000) break

    } while (pageKey)


    // =========================================
    // FETCH INCOMING
    // =========================================
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
          excludeZeroValue: true,
          maxCount: "0x3e8",
          pageKey,
          toAddress: address
        }]
      })

      const result = res.data.result

      if (result?.transfers) {
        allTransfers = allTransfers.concat(result.transfers)
      }

      pageKey = result.pageKey

      if (allTransfers.length > 30000) break

    } while (pageKey)


    // =========================================
    // GROUP BY TX HASH
    // =========================================
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

    // =========================================
    // ANALYSE TX
    // =========================================
    for (const [txHash, txs] of txMap.entries()) {

      let sentAssets: string[] = []
      let receivedAssets: string[] = []

      for (const tx of txs) {

        const asset = (tx.asset || "").toUpperCase()
        const value = Number(tx.value || 0)

        if (tx.from?.toLowerCase() === address) {
          sentAssets.push(asset)

          // volume calc
          if (value) {

            if (STABLES.includes(asset)) {
              volumeUSD += value
            }

            if (asset === "ETH" || asset === "WETH") {
              volumeUSD += value * 3000
            }
          }
        }

        if (tx.to?.toLowerCase() === address) {
          receivedAssets.push(asset)
        }

        // trading day
        if (tx.metadata?.blockTimestamp) {
          const day = new Date(tx.metadata.blockTimestamp)
            .toISOString()
            .split("T")[0]

          tradingDays[day] = true
        }
      }

      const uniqueSent = Array.from(new Set(sentAssets))
      const uniqueReceived = Array.from(new Set(receivedAssets))

      // =========================================
      // SWAP DETECT
      // =========================================
      if (
        uniqueSent.length > 0 &&
        uniqueReceived.length > 0 &&
        JSON.stringify(uniqueSent) !== JSON.stringify(uniqueReceived)
      ) {

        swapCount++

        // =====================================
        // GAS CALC
        // =====================================
        if (!processedTx[txHash]) {

          processedTx[txHash] = true

          try {

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

          } catch {}
        }
      }
    }


    const tradingDaysCount = Object.keys(tradingDays).length

    const score =
      (swapCount * 2) +
      tradingDaysCount +
      (volumeUSD / 100) +
      (gasETH * 5000)


    // =========================================
    // INSERT LEADERBOARD
    // =========================================
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

  } catch (err) {

    console.log(err)

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
