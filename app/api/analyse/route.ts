import { NextRequest, NextResponse } from "next/server"
import axios from "axios"

const RPC =
  process.env.BASE_RPC ||
  `https://base-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`

const rpc = axios.create({
  baseURL: RPC,
  timeout: 10000
})

/* GET USERNAME */
async function getUsername(wallet:string){

try{

/* farcaster */
const fc = await fetch(
`https://api.neynar.com/v2/farcaster/user/bulk-by-address?addresses=${wallet}`,
{
headers:{
"api_key":process.env.NEYNAR_API_KEY || ""
}
}
)

const fcJson = await fc.json()

const user =
fcJson?.result?.[wallet?.toLowerCase()]?.[0]

if(user){
return {
username:user.username,
display:user.display_name,
pfp:user.pfp_url
}
}

}catch{}

try{

/* ENS fallback */
const ens = await fetch(
`https://api.ensideas.com/ens/resolve/${wallet}`
)

const ensJson = await ens.json()

if(ensJson?.name){
return {
username:ensJson.name,
display:ensJson.name,
pfp:null
}
}

}catch{}

return {
username:null,
display:null,
pfp:null
}

}

export async function POST(req: NextRequest) {
  try {

    const { wallet } = await req.json()

    if (!wallet) {
      return NextResponse.json({ error: "Wallet required" })
    }

    const address = wallet.toLowerCase().trim()

    /* GET USERNAME */
    const user = await getUsername(address)

    let allTransfers: any[] = []
    let pageKey: string | undefined = undefined
    let seen = new Set<string>()

    do {

      const res = await rpc.post("", {
        jsonrpc: "2.0",
        id: 1,
        method: "alchemy_getAssetTransfers",
        params: [
          {
            fromBlock: "0x0",
            toBlock: "latest",
            fromAddress: address,
            category: ["external", "erc20"],
            withMetadata: true,
            maxCount: "0x3e8",
            pageKey,
          },
        ],
      })

      const result = res?.data?.result

      if (result?.transfers?.length) {

        for (const tx of result.transfers) {

          const hash =
            (tx.hash || "") +
            (tx.uniqueId || "") +
            (tx.metadata?.blockTimestamp || "")

          if (!seen.has(hash)) {
            seen.add(hash)
            allTransfers.push(tx)
          }

        }

      }

      pageKey = result?.pageKey

      if (!pageKey) break
      if (allTransfers.length > 10000) break

    } while (true)

    let totalTxns = allTransfers.length
    let totalVolumeETH = 0
    let totalGasETH = 0

    const days = new Set<string>()

    for (const tx of allTransfers) {

      const value = parseFloat(tx?.value || "0")
      const asset = (tx?.asset || "").toUpperCase()

      if (!isNaN(value) && value > 0) {

        if (asset === "ETH" || asset === "WETH") {
          totalVolumeETH += value
        }

        if (asset === "USDC" || asset === "USDT") {
          totalVolumeETH += value / 3000
        }

      }

      totalGasETH += 0.0000025

      if (tx?.metadata?.blockTimestamp) {

        const d = new Date(tx.metadata.blockTimestamp)
          .toISOString()
          .split("T")[0]

        days.add(d)

      }

    }

    return NextResponse.json({
      wallet,
      username:user.username,
      display:user.display,
      pfp:user.pfp,
      totalTxns,
      totalVolumeETH: Number(totalVolumeETH.toFixed(4)),
      totalGasETH: Number(totalGasETH.toFixed(6)),
      activeDays: days.size
    })

  } catch (err) {

    console.error("analyse error", err)

    return NextResponse.json({
      totalTxns: 0,
      totalVolumeETH: 0,
      totalGasETH: 0,
      activeDays: 0
    })

  }
}
