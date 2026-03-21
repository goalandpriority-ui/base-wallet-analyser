import { NextRequest, NextResponse } from "next/server"
import axios from "axios"

const rpc = axios.create({
  baseURL: process.env.BASE_RPC,
  timeout: 8000, // 🔥 prevent hanging
})

export async function POST(req: NextRequest) {
  try {
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
          break // 🔥 stop but don't fail
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

    for (const entry of Array.from(txMap.entries())) {
      const txHash = entry[0]
      const transfers = entry[1]

      let sentAssets: string[] = []
      let receivedAssets: string[] = []

      for (const t of transfers) {
        const asset = (t.asset || "").toUpperCase()

        if (t.from?.toLowerCase() === address) sentAssets.push(asset)
        if (t.to?.toLowerCase() === address) receivedAssets.push(asset)
      }

      const uniqueSent = Array.from(new Set(sentAssets))
      const uniqueReceived = Array.from(new Set(receivedAssets))

      if (
        uniqueSent.length > 0 &&
        uniqueReceived.length > 0 &&
        JSON.stringify(uniqueSent) !== JSON.stringify(uniqueReceived)
      ) {
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

        const sample = transfers[0]
        if (sample.metadata?.blockTimestamp) {
          const day = new Date(sample.metadata.blockTimestamp)
            .toISOString()
            .split("T")[0]

          tradingDays[day] = true
        }
      }
    }

    await Promise.all(gasPromises)

    // 🔥 NEVER FAIL RESPONSE
    return NextResponse.json({
      wallet,
      swapCount: swapCount || 0,
      tradingVolumeUSD: Number(volumeUSD.toFixed(2)) || 0,
      tradingDays: Object.keys(tradingDays).length || 0,
      tradingGasETH: Number(gasETH.toFixed(6)) || 0,
    })

  } catch (err) {

    // 🔥 NEVER THROW ERROR
    return NextResponse.json({
      wallet: "",
      swapCount: 0,
      tradingVolumeUSD: 0,
      tradingDays: 0,
      tradingGasETH: 0,
    })
  }
}
