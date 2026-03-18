import { NextRequest, NextResponse } from "next/server"
import axios from "axios"

const cache: Record<string, any> = {}

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
    // FETCH TRANSACTIONS
    // -------------------------
    const res = await axios.post(process.env.BASE_RPC!, {
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
        },
      ],
    })

    const transfers = res.data.result.transfers || []

    const totalTxns = transfers.length

    // -------------------------
    // VOLUME CALC
    // -------------------------
    let totalVolumeETH = 0

    for (const tx of transfers) {
      if (tx.value) {
        totalVolumeETH += Number(tx.value)
      }
    }

    // -------------------------
    // GAS (approx)
    // -------------------------
    const totalGasETH = totalTxns * 0.000002

    // -------------------------
    // ACTIVE DAYS
    // -------------------------
    const daysSet = new Set<string>()

    for (const tx of transfers) {
      if (tx.metadata?.blockTimestamp) {
        const day = new Date(tx.metadata.blockTimestamp)
          .toISOString()
          .split("T")[0]
        daysSet.add(day)
      }
    }

    const activeDays = daysSet.size

    const result = {
      wallet,
      totalTxns,
      totalVolumeETH: Number(totalVolumeETH.toFixed(4)),
      totalGasETH: Number(totalGasETH.toFixed(6)),
      activeDays,
    }

    // 🔥 SAVE CACHE
    cache[wallet] = {
      data: result,
      timestamp: now,
    }

    return NextResponse.json(result)

  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
      }
