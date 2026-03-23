import { NextRequest, NextResponse } from "next/server"
import axios from "axios"

const rpc = axios.create({
  baseURL:
    "https://base-mainnet.g.alchemy.com/v2/" +
    process.env.ALCHEMY_API_KEY,
  timeout: 20000
})

export async function POST(req: NextRequest) {

  try {

    const { wallet } = await req.json()
    const address = wallet.toLowerCase()

    let all: any[] = []
    let pageKey: any = undefined

    // fetch all erc20 transfers
    do {

      const res = await rpc.post("/", {
        jsonrpc: "2.0",
        id: 1,
        method: "alchemy_getAssetTransfers",
        params: [{
          fromBlock: "0x0",
          toBlock: "latest",
          category: ["erc20"],
          withMetadata: true,
          maxCount: "0x3e8",
          pageKey,
          fromAddress: address,
          toAddress: address
        }]
      })

      const result = res.data.result

      all = all.concat(result.transfers || [])
      pageKey = result.pageKey

    } while (pageKey)

    const tokens: Record<string, any> = {}

    for (const tx of all) {

      const symbol =
        tx.asset ||
        tx.rawContract?.address?.slice(0,6) ||
        "UNKNOWN"

      const value = Number(tx.value || 0)

      if (!tokens[symbol]) {
        tokens[symbol] = {
          symbol,
          volume: 0,
          buys: 0,
          sells: 0,
          wins: 0,
          losses: 0,
          lastBuy: 0
        }
      }

      const from = tx.from?.toLowerCase()
      const to = tx.to?.toLowerCase()

      // BUY
      if (to === address) {
        tokens[symbol].buys++
        tokens[symbol].lastBuy = value
      }

      // SELL
      if (from === address) {
        tokens[symbol].sells++

        if (value > tokens[symbol].lastBuy) {
          tokens[symbol].wins++
        } else {
          tokens[symbol].losses++
        }
      }

      tokens[symbol].volume += value
    }

    const list = Object.values(tokens)
      .map((t:any)=>{

        const total = t.wins + t.losses

        const winRate =
          total > 0
            ? (t.wins / total) * 100
            : 0

        return {
          ...t,
          winRate
        }
      })
      .sort((a:any,b:any)=>b.volume-a.volume)
      .slice(0,25)

    return NextResponse.json(list)

  } catch (e) {

    return NextResponse.json([])

  }
}
