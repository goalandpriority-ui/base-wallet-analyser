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

    /* OUTGOING (SELL) */
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
          fromAddress: address
        }]
      })

      const result = res.data.result
      all = all.concat(result.transfers || [])
      pageKey = result.pageKey

    } while (pageKey)

    pageKey = undefined

    /* INCOMING (BUY) */
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

      if (!value || value === 0) continue

      if (!tokens[symbol]) {
        tokens[symbol] = {
          symbol,
          volume: 0,
          buys: 0,
          sells: 0,
          profit: 0,
          lastBuy: 0,
          trades: 0
        }
      }

      const from = tx.from?.toLowerCase()
      const to = tx.to?.toLowerCase()

      /* BUY */
      if (to === address) {
        tokens[symbol].buys++
        tokens[symbol].lastBuy = value
        tokens[symbol].trades++
      }

      /* SELL */
      if (from === address) {
        tokens[symbol].sells++
        tokens[symbol].profit +=
          value - tokens[symbol].lastBuy
        tokens[symbol].trades++
      }

      tokens[symbol].volume += value
    }

    const list = Object.values(tokens)
      .map((t:any)=>{

        const wins = t.profit > 0 ? 1 : 0
        const losses = t.profit <= 0 ? 1 : 0

        const total = wins + losses

        const winRate =
          total > 0
            ? (wins / total) * 100
            : 0

        return {
          symbol: t.symbol,
          volume: t.volume,
          buys: t.buys,
          sells: t.sells,
          profit: t.profit,
          trades: t.trades,
          winRate
        }

      })
      .sort((a:any,b:any)=>b.volume-a.volume)
      .slice(0,50)

    return NextResponse.json(list)

  } catch (e) {

    return NextResponse.json([])

  }
          }
