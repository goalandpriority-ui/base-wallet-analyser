import { NextRequest, NextResponse } from "next/server"
import axios from "axios"

const RPC =
"https://base-mainnet.g.alchemy.com/v2/" +
process.env.ALCHEMY_API_KEY

export async function POST(req:NextRequest){

try{

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

/* group by hash */

const map:Record<string,any[]> = {}

for(const t of txs){
if(!map[t.hash]) map[t.hash]=[]
map[t.hash].push(t)
}

const history:any[] = []

for(const hash in map){

const group = map[hash]

/* sort transfers */
group.sort(
(a,b)=>
new Date(a.metadata.blockTimestamp).getTime()
-
new Date(b.metadata.blockTimestamp).getTime()
)

let firstOut:any=null
let lastIn:any=null

for(const tx of group){

const from = tx.from?.toLowerCase()
const to = tx.to?.toLowerCase()

const token =
tx.asset ||
tx.rawContract?.address?.slice(0,6) ||
"UNK"

const value = parseFloat(tx.value || "0")
if(!value) continue

/* first token sent */
if(from===address && !firstOut){
firstOut={
token,
amount:value
}
}

/* last token received */
if(to===address){
lastIn={
token,
amount:value
}
}

}

/* router swap detect */

if(firstOut && lastIn){

history.push({
token:lastIn.token,
entry:firstOut.amount,
exit:lastIn.amount,
amount:lastIn.amount,
pnl:lastIn.amount-firstOut.amount
})

}

}

return NextResponse.json(history.reverse())

}catch(e){

return NextResponse.json([])

}

}
