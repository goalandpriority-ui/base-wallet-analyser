import { NextRequest, NextResponse } from "next/server"
import axios from "axios"

const RPC =
"https://base-mainnet.g.alchemy.com/v2/" +
process.env.ALCHEMY_API_KEY

export async function POST(req: NextRequest) {

try {

const { wallet } = await req.json()
const address = wallet.toLowerCase()

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

/* group by tx */

const map:Record<string,any[]>={}

for(const t of txs){
if(!map[t.hash]) map[t.hash]=[]
map[t.hash].push(t)
}

const history:any[]=[]

for(const hash in map){

const group = map[hash]

let sent:any[]=[]
let received:any[]=[]

for(const tx of group){

const from = tx.from?.toLowerCase()
const to = tx.to?.toLowerCase()

const token =
tx.asset ||
tx.rawContract?.address?.slice(0,6)

const value = parseFloat(tx.value || "0")
if(!value) continue

if(from===address) sent.push({token,value})
if(to===address) received.push({token,value})

}

if(!sent.length || !received.length) continue

/* pick biggest only */

const biggestSent =
sent.sort((a,b)=>b.value-a.value)[0]

const biggestRecv =
received.sort((a,b)=>b.value-a.value)[0]

/* ignore same token */
if(biggestSent.token === biggestRecv.token) continue

history.push({
symbol:biggestRecv.token,
entry:biggestSent.value,
exit:biggestRecv.value,
volume:biggestRecv.value,
profit:biggestRecv.value-biggestSent.value,
winRate:biggestRecv.value>biggestSent.value?100:0
})

}

return NextResponse.json(history.reverse())

}catch{
return NextResponse.json([])
}

}
