import { NextRequest, NextResponse } from "next/server"
import axios from "axios"

const ALCHEMY_URL = process.env.BASE_RPC!

// 🔥 cache (avoid repeated API calls)
const DECIMAL_CACHE: { [key: string]: number } = {}

// 🔥 get token decimals
async function getTokenDecimals(contract: string) {
  if (!contract) return 18

  if (DECIMAL_CACHE[contract]) {
    return DECIMAL_CACHE[contract]
  }

  try {
    const res = await axios.post(ALCHEMY_URL, {
      jsonrpc: "2.0",
      id: 1,
      method: "alchemy_getTokenMetadata",
      params: [contract],
    })

    const decimals = res.data.result?.decimals || 18
    DECIMAL_CACHE[contract] = decimals

    return decimals
  } catch {
    return 18
  }
}

// 🔥 convert raw value → real value
async function getRealValue(t: any) {
  if (t.value) return Number(t.value)

  if (t.rawContract?.value) {
    const raw = parseInt(t.rawContract.value, 16)

    const decimals = await getTokenDecimals(
      t.rawContract.address
    )

    return raw / Math.pow(10, decimals)
  }

  return 0
}

export async function POST(req: NextRequest) {
  try {
    const { wallet } = await req.json()

    if (!wallet) {
      return NextResponse.json({ error: "Wallet required" })
    }

    const address = wallet.toLowerCase()

    let allTransfers: any[] = []
    let pageKey: string | undefined = undefined

    // =========================================
    // 🔥 FETCH TRANSFERS
    // =========================================
    do {
      const res = await axios.post(ALCHEMY_URL, {
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
            fromAddress: address,
          },
        ],
      })

      const result = res.data.result

      if (result?.transfers) {
        allTransfers = allTransfers.concat(result.transfers)
      }

      pageKey = result.pageKey
      if (allTransfers.length > 6000) break

    } while (pageKey)

    pageKey = undefined

    do {
      const res = await axios.post(ALCHEMY_URL, {
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
            toAddress: address,
          },
        ],
      })

      const result = res.data.result

      if (result?.transfers) {
        allTransfers = allTransfers.concat(result.transfers)
      }

      pageKey = result.pageKey
      if (allTransfers.length > 12000) break

    } while (pageKey)

    // =========================================
    // 🔥 GROUP TX
    // =========================================
    const txMap: { [key: string]: any[] } = {}

    for (const tx of allTransfers) {
      if (!txMap[tx.hash]) txMap[tx.hash] = []
      txMap[tx.hash].push(tx)
    }

    // =========================================
    // 🔥 SWAP + REAL VOLUME
    // =========================================
    let swapCount = 0
    let volumeUSD = 0
    const tradingDays: { [key: string]: boolean } = {}

    const ETH_PRICE = 3000

    for (const hash in txMap) {
      const transfers = txMap[hash]

      let sentAssets: string[] = []
      let receivedAssets: string[] = []

      let txVolumeUSD = 0

      for (const t of transfers) {
        const value = await getRealValue(t)
        const asset = (t.asset || "").toUpperCase()

        if (!value || !asset) continue

        if (t.from?.toLowerCase() === address) {
          sentAssets.push(asset)

          if (asset === "ETH" || asset === "WETH") {
            txVolumeUSD += value * ETH_PRICE
          } else if (asset === "USDC" || asset === "USDT") {
            txVolumeUSD += value
          } else {
            // fallback (small weight)
            txVolumeUSD += value * 0.5
          }
        }

        if (t.to?.toLowerCase() === address) {
          receivedAssets.push(asset)
        }
      }

      const uniqueSent = sentAssets.filter((v, i, a) => a.indexOf(v) === i)
      const uniqueReceived = receivedAssets.filter((v, i, a) => a.indexOf(v) === i)

      if (
        uniqueSent.length > 0 &&
        uniqueReceived.length > 0 &&
        JSON.stringify(uniqueSent) !== JSON.stringify(uniqueReceived)
      ) {
        swapCount++
        volumeUSD += txVolumeUSD

        const sample = transfers[0]
        if (sample.metadata?.blockTimestamp) {
          const day = new Date(sample.metadata.blockTimestamp)
            .toISOString()
            .split("T")[0]

          tradingDays[day] = true
        }
      }
    }

    return NextResponse.json({
      wallet,
      swapCount,
      tradingVolumeUSD: Number(volumeUSD.toFixed(2)),
      tradingDays: Object.keys(tradingDays).length,
      source: "REAL PRO (Decimals + USD) 🔥",
    })

  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: "Analysis failed" })
  }
}
