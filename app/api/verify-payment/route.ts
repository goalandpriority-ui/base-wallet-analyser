import { NextRequest, NextResponse } from "next/server"
import axios from "axios"

const REQUIRED_ETH = 0.000025
const RECEIVER = "YOUR_WALLET_ADDRESS" // change this

export async function POST(req: NextRequest) {
  try {
    const { txHash } = await req.json()

    if (!txHash) {
      return NextResponse.json({ valid: false })
    }

    const res = await axios.post(process.env.BASE_RPC!, {
      jsonrpc: "2.0",
      id: 1,
      method: "eth_getTransactionByHash",
      params: [txHash],
    })

    const tx = res.data.result

    if (!tx) {
      return NextResponse.json({ valid: false })
    }

    const valueETH = parseInt(tx.value, 16) / 1e18

    const isValid =
      valueETH >= REQUIRED_ETH &&
      tx.to?.toLowerCase() === RECEIVER.toLowerCase()

    return NextResponse.json({ valid: isValid })

  } catch (err) {
    return NextResponse.json({ valid: false })
  }
}
