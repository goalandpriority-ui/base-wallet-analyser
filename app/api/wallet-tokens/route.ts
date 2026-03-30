import { NextRequest, NextResponse } from "next/server"
import axios from "axios"

const RPC =
"https://base-mainnet.g.alchemy.com/v2/" +
process.env.ALCHEMY_API_KEY

export async function POST(req: NextRequest) {

try {

const { wallet } = await req.json()
const address = wallet.toLowerCase()

/* outgoing */

const out = await axios.post(RPC,{
jsonrpc:"2.0",
id:1,
method:"alchemy_getAssetTransfers",
params:[{
fromBlock:"0x0",
toBlock:"latest",
category:["erc20"],
withMetadata:true,
maxCount:"0x3e8",
fromAddress:address
}]
})

/* incoming */

const inc = await axios.post(RPC,{
jsonrpc:"2.0",
id:1,
method:"alchemy_getAssetTransfers",
params:[{
fromBlock:"0x0",
toBlock:"latest",
category:["erc20"],
withMetadata:true,
maxCount:"0x3e8",
toAddress:address
}]
})

const txs = [
...(out.data.result.transfers || []),
...(inc.data.result.transfers || [])
]

/* group */

const map: Record<string, any[]> = {}

for (const t of txs) {
if (!map[t.hash]) map[t.hash] = []
map[t.hash].push(t)
}

const history:any[] = []

for (const hash in map) {

const group = map[hash]

let sent:any[]=[]
let received:any[]=[]

for (const tx of group) {

const from = tx.from?.toLowerCase()
const to = tx.to?.toLowerCase()

const token =
tx.asset ||
tx.rawContract?.address?.slice(0,6)

const value = parseFloat(tx.value || "0")
if (!value) continue

if (from === address) {
sent.push({token,value})
}

if (to === address) {
received.push({token,value})
}

}

/* detect swap */

for(const s of sent){

for(const r of received){

/* ignore same token */
if(s.token === r.token) continue

history.push({
symbol:r.token,
volume:r.value,
entry:s.value,
exit:r.value,
profit:r.value-s.value,
winRate:r.value>s.value ? 100 : 0
})

}

}

}

return NextResponse.json(history.reverse())

} catch {

return NextResponse.json([])

}

}
