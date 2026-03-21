import { NextRequest, NextResponse } from "next/server"
import axios from "axios"
import { getSupabase } from "../../../lib/supabase"

// 🔥 RPC SAFE
const RPC =
  process.env.BASE_RPC ||
  `https://base-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`

const rpc = axios.create({
  baseURL: RPC,
  timeout: 10000
})

// 🔥 BASE DEX ROUTERS
const ROUTERS = [
  "0x1111111254eeb25477b68fb85ed929f73a960582", // 1inch
  "0xe592427a0aece92de3edee1f18e0157c05861564", // uniswap v3
  "0x3fc91a3afd70395cd496c647d5a6cc9d4b2b7fad", // universal router
  "0xdef1c0ded9bec7f1a1670819833240f027b25eff", // 0x
  "0x2626664c2603336e57b271c5c0b26f421741e481", // base router
]

export async function POST(req: NextRequest) {

  try {

    const supabase = getSupabase()
    const { wallet } = await req.json()

    const address = wallet.toLowerCase()

    let allTransfers:any[] = []
    let pageKey:any = undefined

    // FROM
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

    // TO
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

      // 🔥 GET TX
      const txData = await rpc.post("", {
        jsonrpc:"2.0",
        id:1,
        method:"eth_getTransactionByHash",
        params:[txHash]
      })

      const tx = txData.data.result
      const to = tx?.to?.toLowerCase()
      const input = tx?.input || ""

      // 🔥 ROUTER DETECT
      const routerSwap = ROUTERS.includes(to)

      // 🔥 METHOD DETECT
      const methodSwap =
        input.startsWith("0x38ed1739") ||
        input.startsWith("0x18cbafe5") ||
        input.startsWith("0x7ff36ab5") ||
        input.startsWith("0x5c11d795") ||
        input.startsWith("0x414bf389") ||
        input.startsWith("0x3593564c") ||
        input.startsWith("0x04e45aaf")

      const isSwap = routerSwap || methodSwap

      if (isSwap) {

        swapCount++

        for (const t of txs) {

          const asset = (t.asset || "").toUpperCase()
          const value = Number(t.value || 0)

          if (value && t.from?.toLowerCase() === address) {

            if (STABLES.includes(asset)) {
              volumeUSD += value
            }

            if (asset === "ETH" || asset === "WETH") {
              volumeUSD += value * 3000
            }
          }

          if (t.metadata?.blockTimestamp) {
            const day = new Date(t.metadata.blockTimestamp)
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
