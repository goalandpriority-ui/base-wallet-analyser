"use client"

import { useEffect, useState } from "react"
import Link from "next/link"

export default function CopyTrading(){

const [data,setData]=useState<any[]>([])

useEffect(()=>{

const load = async()=>{

try{
const res = await fetch("/api/top-traders")
const json = await res.json()

let rows:any[] = []

if(Array.isArray(json)) rows = json
else rows = json?.data || []

const mapped = rows.map((w:any)=>({
...w,
swaps: w.swapcount ?? w.swaps ?? 0,
volume: w.tradingvolumeusd ?? w.volume ?? 0,
score: w.score ?? 0
}))

setData(mapped)

}catch{
setData([])
}

}

load()

},[])

const getTag = (w:any)=>{
if((w?.volume||0) > 100000) return "🐋 Whale"
if((w?.swaps||0) > 500) return "⚡ Trader"
if((w?.score||0) > 5000) return "💎 Alpha"
return "📈 Trader"
}

return(

<div style={wrap}>
<h1 style={title}>
📊 Top Wallet Performance
</h1>

<div style={subtitle}>
Best performing wallets on Base
</div>

{data.length === 0 && (
<div style={{opacity:.6}}>No wallets found</div>
)}

{data.map((w,i)=>{

const wallet = w?.wallet || "unknown"

const winRate =
w?.score
? Math.min((w.score/100),100)
: 0

const volumeBar =
Math.min((w?.volume || 0) / 1000,100)

return(

<div key={i} style={card}>

<div style={rowTop}>
<div>
#{i+1} {getTag(w)}
</div>

<div style={score}>
Score {w?.score ?? "-"}
</div>
</div>

<div style={walletStyle}>
{wallet}
</div>

<div style={label}>Performance</div>
<div style={bar}>
<div style={{
...barFill,
width:`${winRate}%`
}}/>
</div>

<div style={label}>Volume</div>
<div style={bar}>
<div style={{
...barFill,
width:`${volumeBar}%`
}}/>
</div>

<div style={stats}>
Swaps: {w?.swaps ?? 0} • 
Volume: ${Math.round(w?.volume ?? 0)}
</div>

<div style={btnRow}>
<Link href={`/wallet/${wallet}`} style={link}>
View wallet
</Link>
</div>

</div>
)

})}

</div>
)
}

/* styles */

const wrap={
padding:20,
maxWidth:800,
margin:"auto"
}

const title={
fontSize:28,
fontWeight:700,
marginBottom:4
}

const subtitle={
opacity:.6,
marginBottom:20
}

const card={
background:"#020617",
padding:16,
borderRadius:14,
marginBottom:12,
border:"1px solid #111"
}

const rowTop={
display:"flex",
justifyContent:"space-between",
marginBottom:6
}

const walletStyle={
fontSize:12,
opacity:.8,
wordBreak:"break-all" as const,
marginBottom:8
}

const score={
color:"#22c55e",
fontWeight:600
}

const label={
fontSize:11,
opacity:.6,
marginTop:6
}

const bar={
height:6,
background:"#111",
borderRadius:20,
overflow:"hidden",
marginTop:4
}

const barFill={
height:"100%",
background:"#22c55e"
}

const stats={
fontSize:11,
opacity:.6,
marginTop:8
}

const btnRow={
display:"flex",
gap:8,
marginTop:10
}

const link={
padding:"6px 12px",
borderRadius:8,
background:"#020617",
border:"1px solid #1f2937",
textDecoration:"none",
color:"#22c55e",
fontSize:12
}
