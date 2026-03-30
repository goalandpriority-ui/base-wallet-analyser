"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"

export default function WalletProfile(){

const params = useParams()
const address = params?.address as string

const [data,setData]=useState<any>(null)
const [trades,setTrades]=useState<any[]>([])
const [lastTrade,setLastTrade]=useState<any>(null)
const [active,setActive]=useState<any>(null)

/* LOAD */

useEffect(()=>{

if(!address) return

const load = async()=>{

/* performance */
try{

const r = await fetch("/api/analyse-pro",{
method:"POST",
headers:{ "Content-Type":"application/json" },
body:JSON.stringify({wallet:address})
})

const j = await r.json()
setData(j || {})

}catch{
setData({})
}

/* trades */
try{

const t = await fetch("/api/wallet-trades",{
method:"POST",
headers:{ "Content-Type":"application/json" },
body:JSON.stringify({wallet:address})
})

const arr = await t.json()

setTrades(arr || [])

if(arr?.length){
setLastTrade(arr[0])
}

const open = arr.find((t:any)=> !t.sellUsd)
if(open) setActive(open)

}catch{
setTrades([])
}

}

load()

},[address])

/* stats */

const pnl =
trades.reduce((a,t)=>a+(t?.pnl||0),0)

const wins =
trades.filter(t=>t?.pnl>0).length

const losses =
trades.filter(t=>t?.pnl<0).length

const winRate =
(wins+losses)>0
? (wins/(wins+losses))*100
: 0

if(!data){
return <div style={{padding:20}}>Loading...</div>
}

return(
<div style={{padding:20,maxWidth:900,margin:"auto"}}>

{/* header */}

<div style={card}>

<div style={{fontSize:12,opacity:.6}}>
Wallet
</div>

<div style={{
fontSize:16,
wordBreak:"break-all"
}}>
{address}
</div>

</div>

{/* active */}

<div style={card}>
<h3>🟢 Current Position</h3>

{active ? (
<>
<div>Token: {active.symbol}</div>
<div>Buy: ${Math.round(active.buyUsd)}</div>
<div style={{opacity:.6,fontSize:12}}>
{active.time}
</div>
</>
):"No active position"}

</div>

{/* last */}

<div style={card}>
<h3>🔁 Last Trade</h3>

{lastTrade ? (
<>
<div>{lastTrade.symbol}</div>

<div>
Buy ${Math.round(lastTrade.buyUsd)} → 
Sell ${Math.round(lastTrade.sellUsd)}
</div>

<div style={{
color:lastTrade.pnl>=0
? "#22c55e"
: "#ef4444"
}}>
PnL: ${Math.round(lastTrade.pnl)}
</div>

<div style={{opacity:.6,fontSize:12}}>
{lastTrade.time}
</div>
</>
):"No trades"}

</div>

{/* performance */}

<div style={card}>

<h3>Wallet Performance</h3>

<div>Rank: #{data?.rank || "-"}</div>
<div>Score: {Math.round(data?.score || 0)}</div>
<div>Swaps: {data?.swapCount || 0}</div>
<div>Volume: ${Math.round(data?.tradingVolumeUSD || 0)}</div>

<hr style={divider}/>

<div>Win Rate: {winRate.toFixed(1)}%</div>
<div>Total PnL: ${Math.round(pnl)}</div>

</div>

{/* history */}

<div style={card}>

<h3>Trade History</h3>

{trades.length === 0 && (
<div style={{opacity:.6}}>
No trades detected
</div>
)}

{trades.map((t,i)=>(

<div key={i} style={row}>

<div style={{fontWeight:600}}>
{t.symbol}
</div>

<div style={{fontSize:12}}>
Buy ${Math.round(t.buyUsd)} → 
Sell ${Math.round(t.sellUsd)}
</div>

<div style={{
fontSize:12,
color:t.pnl>=0
? "#22c55e"
: "#ef4444"
}}>
PnL ${Math.round(t.pnl)}
</div>

<div style={{opacity:.5,fontSize:11}}>
{t.time}
</div>

</div>

))}

</div>

</div>
)
}

/* styles */

const card={
background:"#020617",
padding:20,
borderRadius:12,
marginBottom:14,
border:"1px solid #111"
}

const row={
padding:"10px 0",
borderBottom:"1px solid #111"
}

const divider={
margin:"10px 0",
borderColor:"#111"
                          }
