import { NextRequest, NextResponse } from "next/server"
import axios from "axios"
import { getSupabase } from "../../../lib/supabase"

const rpc = axios.create({
  baseURL:
    "https://base-mainnet.g.alchemy.com/v2/" +
    process.env.ALCHEMY_API_KEY,
  timeout: 20000
})

const ETH_PRICE = 3500

export async function POST(req: NextRequest) {

  try {

    const supabase = getSupabase()
    const { wallet } = await req.json()
    const address = wallet.toLowerCase()

    let transfers:any[] = []
    let pageKey:any = undefined

    do {

      const res = await rpc.post("/", {
        jsonrpc: "2.0",
        id: 1,
        method: "alchemy_getAssetTransfers",
        params: [{
          fromBlock: "0x0",
          toBlock: "latest",
          fromAddress: address,
          category: ["external","internal","erc20"],
          withMetadata: true,
          maxCount: "0x3e8",
          pageKey
        }]
      })

      const result = res.data.result
      transfers = transfers.concat(result.transfers || [])
      pageKey = result.pageKey

    } while (pageKey)


    const hashes = [
      ...new Set(transfers.map((t:any)=>t.hash))
    ]

    let swapCount = 0
    let volumeUSD = 0
    let gasETH = 0

    const tradingDays = new Set<string>()

    for (const hash of hashes) {

      const receipt = await rpc.post("/", {
        jsonrpc:"2.0",
        id:1,
        method:"eth_getTransactionReceipt",
        params:[hash]
      })

      const r = receipt.data.result
      if (!r) continue

      const logs = r.logs || []

      let isSwap = false

      for (const log of logs) {

        const topic =
          log.topics?.[0]?.toLowerCase()

        if (
          topic ===
          "0xd78ad95fa46c994b6551d0da85fc275fe613ce37657fb8d5e6a6b7e0a5eec8f3"
        ) {
          isSwap = true
          break
        }
      }

      if (!isSwap) continue

      swapCount++

      const tx = transfers.find(
        (t:any)=>t.hash===hash
      )

      if (tx?.value) {
        volumeUSD +=
          Number(tx.value) * ETH_PRICE
      }

      if (tx?.metadata?.blockTimestamp) {

        const day =
          new Date(tx.metadata.blockTimestamp)
            .toISOString()
            .split("T")[0]

        tradingDays.add(day)
      }

      const gas =
        (parseInt(r.gasUsed,16) *
         parseInt(r.effectiveGasPrice,16))
        /1e18

      gasETH += gas
    }

    const tradingDaysCount =
      tradingDays.size

    const score =
      swapCount*2 +
      tradingDaysCount +
      volumeUSD/100 +
      gasETH*5000

    await supabase
      .from("leaderboard")
      .upsert({
        wallet:address,
        score,
        swaps:swapCount,
        volume:volumeUSD,
        days:tradingDaysCount,
        gas:gasETH
      },{onConflict:"wallet"})

    return NextResponse.json({
      wallet,
      swapCount,
      tradingVolumeUSD:
        Number(volumeUSD.toFixed(2)),
      tradingDays:tradingDaysCount,
      tradingGasETH:
        Number(gasETH.toFixed(6)),
      score:Math.round(score),
      rank:1
    })

  } catch {

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
