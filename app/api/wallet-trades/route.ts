export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from "next/server"

const URL = process.env.GOLDSKY_URL!

export async function POST(req:NextRequest){

try{

const { wallet } = await req.json()
if(!wallet) return NextResponse.json([])

const w = wallet.toLowerCase()

const query = `
{
swaps(
first:20,
orderBy:timestamp,
orderDirection:desc,
where:{ sender:"${w}" }
){
tokenIn{symbol}
tokenOut{symbol}
amountIn
amountOut
timestamp
}
}
`

const res = await fetch(URL,{
method:"POST",
headers:{ "content-type":"application/json" },
body:JSON.stringify({query})
})

const json = await res.json()

const swaps = json?.data?.swaps || []

const trades = swaps.map((s:any)=>({
symbol: s.tokenOut.symbol,
buyUsd: Number(s.amountOut),
sellUsd: Number(s.amountIn),
pnl: Number(s.amountIn) - Number(s.amountOut),
time: new Date(Number(s.timestamp)*1000).toISOString()
}))

return NextResponse.json(trades)

}catch(e){
console.log(e)
return NextResponse.json([])
}

}
