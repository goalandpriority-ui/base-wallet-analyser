import { NextRequest, NextResponse } from "next/server"
import axios from "axios"
import { getSupabase } from "../../../lib/supabase"

const rpc = axios.create({
  baseURL: "https://base-mainnet.g.alchemy.com/v2/" + process.env.ALCHEMY_API_KEY,
  timeout: 10000
})

export async function POST(req: NextRequest) {

  try {

    const supabase = getSupabase()
    const { wallet } = await req.json()
    const address = wallet.toLowerCase()

    let allTransfers: any[] = []
    let pageKey: any = undefined

    // FETCH FROM
    do {
      const res = await rpc.post("/", {
        jsonrpc: "2.0",
        id: 1,
        method: "alchemy_getAssetTransfers",
        params: [{
          fromBlock: "0x0",
          toBlock: "latest",
          category: ["external", "internal", "erc20", "erc721", "erc1155"],
          withMetadata: true,
          maxCount: "0x3e8",
          pageKey,
          fromAddress: address
        }]
      })

      if (res.data.error) {
        console.error("Alchemy FROM error:", res.data.error.message)
        throw new Error("Alchemy FROM fetch failed")
      }

      const result = res.data.result
      allTransfers = allTransfers.concat(result.transfers || [])
      pageKey = result.pageKey

    } while (pageKey)


    // FETCH TO
    pageKey = undefined

    do {
      const res = await rpc.post("/", {
        jsonrpc: "2.0",
        id: 1,
        method: "alchemy_getAssetTransfers",
        params: [{
          fromBlock: "0x0",
          toBlock: "latest",
          category: ["external", "internal", "erc20", "erc721", "erc1155"],
          withMetadata: true,
          maxCount: "0x3e8",
          pageKey,
          toAddress: address
        }]
      })

      if (res.data.error) {
        console.error("Alchemy TO error:", res.data.error.message)
        throw new Error("Alchemy TO fetch failed")
      }

      const result = res.data.result
      allTransfers = allTransfers.concat(result.transfers || [])
      pageKey = result.pageKey

    } while (pageKey)

    console.log("Total transfers fetched:", allTransfers.length)

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

    const STABLES = ["USDC", "USDT", "DAI"]
    const APPROX_ETH_PRICE = 3500

    const extraTxs = new Set<string>()
    for (const t of allTransfers) {
      if (t.hash) extraTxs.add(t.hash)
    }

    const txHashes = Array.from(extraTxs)

    for (const txHash of txHashes) {

      const txData = await rpc.post("/", {
        jsonrpc: "2.0",
        id: 1,
        method: "eth_getTransactionByHash",
        params: [txHash]
      })

      const tx = txData.data.result
      if (!tx) continue

      const receipt = await rpc.post("/", {
        jsonrpc: "2.0",
        id: 1,
        method: "eth_getTransactionReceipt",
        params: [txHash]
      })

      const r = receipt.data.result
      if (!r) continue

      const logs = r.logs || []

      let isSwap = false

      for (const log of logs) {

        const topic = log.topics?.[0]?.toLowerCase() || ""

        if (
          topic === "0xd78ad95fa46c994b6551d0da85fc275fe613ce37657fb8d5e6a6b7e0a5eec8f3" ||
          topic === "0xc42079f94a6350d7e6235f29174924f928cc2ac818eb64fed8004e115fbcca67"
        ) {
          isSwap = true
          break
        }
      }

      if (!isSwap && tx.input && tx.input !== "0x") {

        const inputLower = tx.input.toLowerCase()

        if (
          inputLower.startsWith("0x5ae401dc") ||
          inputLower.startsWith("0x38ed1739") ||
          inputLower.startsWith("0x3593564c") ||
          inputLower.startsWith("0x414bf389") ||
          inputLower.startsWith("0x18cbafe5") ||
          inputLower.startsWith("0x7ff36ab5") ||
          inputLower.startsWith("0x8803dbee") ||
          inputLower.startsWith("0x5c11d795")
        ) {
          isSwap = true
        }
      }

      if (!isSwap) continue

      swapCount++

      const txs = txMap.get(txHash) || []

      for (const t of txs) {

        const asset = (t.asset || "").toUpperCase()
        const value = Number(t.value || 0)

        const fromAddr = t.from?.toLowerCase()
        const toAddr = t.to?.toLowerCase()

        if (value > 0) {

          if (fromAddr === address) {
            if (STABLES.includes(asset)) volumeUSD += value
            if (asset === "ETH" || asset === "WETH") {
              volumeUSD += value * APPROX_ETH_PRICE
            }
          }

          if (toAddr === address) {
            if (STABLES.includes(asset)) volumeUSD += value
            if (asset === "ETH" || asset === "WETH") {
              volumeUSD += value * APPROX_ETH_PRICE
            }
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

        const gasUsed = BigInt(r.gasUsed || "0x0")

        let gasPrice = BigInt(r.effectiveGasPrice || "0x0")

        if (gasPrice === BigInt(0)) {
          gasPrice = BigInt(tx.gasPrice || "0x0")
        }

        const txGasETH =
          Number(gasUsed * gasPrice) / 1e18

        gasETH += txGasETH
      }
    }

    const tradingDaysCount = Object.keys(tradingDays).length

    const score =
      (swapCount * 2) +
      tradingDaysCount +
      (volumeUSD / 100) +
      (gasETH * 5000)

    try {
      await supabase
        .from("leaderboard")
        .upsert(
          {
            wallet: address,
            score,
            swaps: swapCount,
            volume: volumeUSD,
            days: tradingDaysCount,
            gas: gasETH
          },
          { onConflict: "wallet" }
        )
    } catch (supabaseErr: any) {
      console.error("Supabase insert error:", supabaseErr.message)
    }

    return NextResponse.json({
      wallet,
      swapCount,
      tradingVolumeUSD: Number(volumeUSD.toFixed(2)),
      tradingDays: tradingDaysCount,
      tradingGasETH: Number(gasETH.toFixed(6)),
      score: Math.round(score),
      rank: 1
    })

  } catch (e: any) {

    console.error("analyse-pro error:", e)

    return NextResponse.json({
      wallet: "",
      swapCount: 0,
      tradingVolumeUSD: 0,
      tradingDays: 0,
      tradingGasETH: 0,
      score: 0,
      rank: 0,
      error: e.message || "Unknown error"
    }, { status: 500 })

  }
}
