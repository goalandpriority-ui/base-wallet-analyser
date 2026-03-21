import { NextRequest, NextResponse } from "next/server"
import axios from "axios"

const cache: Record<string, any> = {}

// 🔥 RPC SAFE (VERCEL FIX)
const RPC =
  process.env.BASE_RPC ||
  `https://base-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`

// 🔥 DEX ROUTERS (BASE + ETH)
const DEX_ROUTERS = [
  "0xE592427A0AEce92De3Edee1F18E0157C05861564".toLowerCase(), // Uniswap V3
  "0x1111111254EEB25477B68fb85Ed929f73A960582".toLowerCase(), // 1inch
]

export async function POST(req: NextRequest) {
  try {
    const { wallet } = await req.json()

    if (!wallet) {
      return NextResponse.json({ error: "Wallet required" }, { status: 400 })
    }

    // 🔥 BASIC VALIDATION
    if (!wallet.startsWith("0x") || wallet.length !== 42) {
      return NextResponse.json({ error: "Invalid wallet address" }, { status: 400 })
    }

    // 🔥 CACHE (10 mins)
    const now = Date.now()
    if (cache[wallet] && now - cache[wallet].timestamp < 10 * 60 * 1000) {
      return NextResponse.json({
        ...cache[wallet].data,
        cached: true,
      })
    }

    // -------------------------
    // 🔥 TIME FILTER (LAST 2 YEARS)
    // -------------------------
    const twoYearsAgo = new Date()
    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2)

    // -------------------------
    // 🔥 PAGINATION FETCH (FULL HISTORY)
    // -------------------------
    let allTransfers: any[] = []
    let pageKey: string | undefined = undefined

    do {
      const res = await axios.post(RPC, {
        jsonrpc: "2.0",
        id: 1,
        method: "alchemy_getAssetTransfers",
        params: [
          {
            fromBlock: "0x0",
            toBlock: "latest",
            fromAddress: wallet,
            category: ["external", "erc20", "erc721"],
            withMetadata: true,
            maxCount: "0x3e8",
            pageKey: pageKey,
          },
        ],
      })

      const result = res.data.result

      if (result.transfers) {
        allTransfers = allTransfers.concat(result.transfers)
      }

      pageKey = result.pageKey

      if (allTransfers.length > 5000) break

    } while (pageKey)

    const transfers = allTransfers

    let totalTxns = 0
    let totalVolumeETH = 0
    let totalGasETH = 0

    // 🔥 NEW PRO METRICS
    let swapCount = 0
    let swapVolumeETH = 0

    const daysSet = new Set<string>()

    for (const tx of transfers) {
      // -------------------------
      // 🔥 DATE FILTER
      // -------------------------
      if (tx.metadata?.blockTimestamp) {
        const txDate = new Date(tx.metadata.blockTimestamp)

        if (txDate < twoYearsAgo) continue

        const day = txDate.toISOString().split("T")[0]
        daysSet.add(day)
      }

      totalTxns++

      // -------------------------
      // 🔥 EXISTING VOLUME LOGIC (UNCHANGED)
      // -------------------------
      if (tx.value) {
        const value = Number(tx.value)

        if (value < 0.001) continue
        if (value > 1000000) continue

        const asset = (tx.asset || "").toUpperCase()
        const allowedAssets = ["ETH", "WETH", "USDC", "USDT", "DAI"]

        if (!allowedAssets.includes(asset)) continue

        let normalizedValue = value

        if (asset === "USDC" || asset === "USDT" || asset === "DAI") {
          normalizedValue = value / 3000
        }

        if (asset === "WETH") {
          normalizedValue = value
        }

        totalVolumeETH += normalizedValue
      }

      // -------------------------
      // 🔥 NEW SWAP DETECTION (PRO 🔥)
      // -------------------------
      if (tx.to && DEX_ROUTERS.includes(tx.to.toLowerCase())) {
        swapCount++

        if (tx.value) {
          const value = Number(tx.value)

          if (value > 0.0001 && value < 1000) {
            swapVolumeETH += value
          }
        }
      }

      // -------------------------
      // 🔥 GAS (UNCHANGED)
      // -------------------------
      totalGasETH += 0.0000025
    }

    const activeDays = daysSet.size

    const result = {
      wallet,
      totalTxns,

      // 🔥 OLD METRICS
      totalVolumeETH: Number(totalVolumeETH.toFixed(4)),

      // 🔥 NEW PRO METRICS
      swapCount,
      swapVolumeETH: Number(swapVolumeETH.toFixed(4)),

      totalGasETH: Number(totalGasETH.toFixed(6)),
      activeDays,
      period: "Last 2 Years",
    }

    cache[wallet] = {
      data: result,
      timestamp: now,
    }

    return NextResponse.json(result)

  } catch (err: any) {
    console.error("analyse error:", err?.response?.data || err)

    return NextResponse.json({
      wallet: "",
      totalTxns: 0,
      totalVolumeETH: 0,
      swapCount: 0,
      swapVolumeETH: 0,
      totalGasETH: 0,
      activeDays: 0,
    })
  }
      }
