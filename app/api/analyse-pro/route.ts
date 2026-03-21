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

    let allTransfers: any[] = []
    let pageKey: any = undefined

    // =========================
    // FETCH FROM
    // =========================

    do {
      const res = await rpc.post("", {
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

      const result = res.data.result
      allTransfers = allTransfers.concat(result.transfers || [])
      pageKey = result.pageKey

    } while (pageKey)

    // =========================
    // FETCH TO
    // =========================

    pageKey = undefined

    do {
      const res = await rpc.post("", {
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

      const result = res.data.result
      allTransfers = allTransfers.concat(result.transfers || [])
      pageKey = result.pageKey

    } while (pageKey)

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

    const STABLES = ["USDC", "USDT", "DAI"]  // DAI kooda add pannalaam Base-la common

    const APPROX_ETH_PRICE = 3500  // Recent avg, update pannu if needed

    // =========================
    // ANALYSE (NEW SWAP ENGINE)
    // =========================

    const txHashes = Array.from(txMap.keys())

    for (const txHash of txHashes) {

      const txData = await rpc.post("", {
        jsonrpc: "2.0",
        id: 1,
        method: "eth_getTransactionByHash",
        params: [txHash]
      })

      const tx = txData.data.result
      if (!tx) continue

      const receipt = await rpc.post("", {
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

        const topic = log.topics?.[0]?.toLowerCase()

        // Uniswap V2 / Aerodrome (Solidly fork - same Swap event)
        if (topic ===
          "0xd78ad95fa46c994b6551d0da85fc275fe613ce37657fb8d5e6a6b7e0a5eec8f3"
        ) {
          isSwap = true
          break
        }

        // Uniswap V3 Swap event
        if (topic ===
          "0xc42079f94a6350d7e6235f29174924f928cc2ac818eb64fed8004e115fbcca67"
        ) {
          isSwap = true
          break
        }

        // Optional: PancakeSwap V3 (Base-la irukku) - same as Uniswap V3 mostly
        // if more DEX venumna extra topic add pannalam
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

          // Outgoing (what user sold/gave)
          if (fromAddr === address) {
            if (STABLES.includes(asset)) {
              volumeUSD += value
            }
            if (asset === "ETH" || asset === "WETH") {
              volumeUSD += value * APPROX_ETH_PRICE
            }
          }

          // Incoming (what user received/bought) - ithu miss aagirunthuchu!
          if (toAddr === address) {
            if (STABLES.includes(asset)) {
              volumeUSD += value
            }
            if (asset === "ETH" || asset === "WETH") {
              volumeUSD += value * APPROX_ETH_PRICE
            }
          }
        }

        // Timestamp collect for trading days
        if (t.metadata?.blockTimestamp) {
          const day = new Date(t.metadata.blockTimestamp)
            .toISOString()
            .split("T")[0]
          tradingDays[day] = true
        }
      }

      if (!processedTx[txHash]) {

        processedTx[txHash] = true

        // Gas safe with BigInt
        const gasUsed = BigInt(r.gasUsed || "0x0")
        let gasPrice = BigInt(r.effectiveGasPrice || "0x0")
        if (gasPrice === 0n) {
          gasPrice = BigInt(tx.gasPrice || "0x0")  // fallback
        }
        const txGasETH = Number((gasUsed * gasPrice) / 1000000000000000000n)
        gasETH += txGasETH
      }
    }

    const tradingDaysCount = Object.keys(tradingDays).length

    const score =
      (swapCount * 2) +
      tradingDaysCount +
      (volumeUSD / 100) +
      (gasETH * 5000)

    // Supabase insert - if duplicate wallet error varuthuna upsert use pannu later
    await supabase.from("leaderboard").insert({
      wallet: address,
      score,
      swaps: swapCount,
      volume: volumeUSD,
      days: tradingDaysCount,
      gas: gasETH
    }).onConflict('wallet').ignore()  // optional: already iruntha skip (or merge later)

    return NextResponse.json({
      wallet,
      swapCount,
      tradingVolumeUSD: Number(volumeUSD.toFixed(2)),
      tradingDays: tradingDaysCount,
      tradingGasETH: Number(gasETH.toFixed(6)),
      score: Math.round(score),
      rank: 1  // nee later real rank calculate pannu
    })

  } catch (e: any) {

    console.error("analyse-pro error:", e.message || e)

    return NextResponse.json({
      wallet: "",
      swapCount: 0,
      tradingVolumeUSD: 0,
      tradingDays: 0,
      tradingGasETH: 0,
      score: 0,
      rank: 0,
      error: e.message || "Unknown error"  // debug easy-a irukkum
    }, { status: 500 })

  }
}
