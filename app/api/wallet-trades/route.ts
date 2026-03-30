export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from "next/server"
import axios from "axios"

const TRANSFER =
"0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a0b6f9e6f"

export async function POST(req:NextRequest){

try{

const { wallet } = await req.json()
if(!wallet) return NextResponse.json([])

const address = wallet.toLowerCase()

/* get logs directly */
const res = await axios.post(process.env.BASE_RPC!,{
jsonrpc:"2.0",
id:1,
method:"eth_getLogs",
params:[{
fromBlock:"0x0",
toBlock:"latest",
topics:[TRANSFER]
}]
})

const logs = res.data.result || []

const trades:any[]=[]

let sent:any=null
let received:any=null

for(const log of logs){

const from =
"0x"+log.topics[1].slice(26)

const to =
"0x"+log.topics[2].slice(26)

const value =
parseInt(log.data,16)/1e18

if(from.toLowerCase()===address){
sent={
token:log.address,
amount:value
}
}

if(to.toLowerCase()===address){
received={
token:log.address,
amount:value
}
}

if(sent && received){

trades.push({
sellToken:sent.token,
buyToken:received.token,
sellAmount:sent.amount,
buyAmount:received.amount
})

sent=null
received=null

}

}

return NextResponse.json(trades)

}catch(e){
console.error(e)
return NextResponse.json([])
}

}
