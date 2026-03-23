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

if(Array.isArray(json)) setData(json)
else setData(json?.data || [])

}catch{
setData([])
}

}

load()

},[])

const copy = (wallet:string)=>{
navigator.clipboard.writeText(wallet || "")
}

const getTag = (w:any)=>{

if((w?.volume||0) > 100000) return "🐋 Whale"
if((w?.swaps||0) > 500) return "⚡ Pro Trader"
if((w?.score||0) > 5000) return "💎 Alpha"

return "📈 Trader"
}

return(
<div style={wrap}>

<h1 style={title}>
🤖 Copy Trading PRO
</h1>

<div style={subtitle}>
Follow top wallets and auto copy trades
</div>

{data.length === 0 && (
<div style={{opacity:.6}}>No traders found</div>
)}

{data.map((w,i)=>{

const wallet = w?.wallet || "unknown"

const winRate =
Math.min((w?.score || 0) / 100,100)

const volumeBar =
Math.min((w?.volume || 0) / 1000,100)

const isPaid = w?.paid

return(

<div
key={i}
style={{
...card,
border:isPaid
? "1px solid #22c55e"
: "1px solid #0f172a",
boxShadow:isPaid
? "0 0 15px rgba(34,197,94,.4)"
: "0 0 25px rgba(34,197,94,.15)"
}}
>

{/* header */}
<div style={rowTop}>

<div>
#{i+1} {getTag(w)}
{isPaid && (
<span style={proBadge}>
PRO
</span>
)}
</div>

<div style={score}>
Score {Math.round(w?.score || 0)}
</div>

</div>

{/* wallet */}
<div style={walletStyle}>
{wallet}
</div>

{/* win rate */}
<div style={label}>Win Rate</div>
<div style={bar}>
<div style={{
...barFill,
width:`${winRate}%`,
background:"linear-gradient(90deg,#22c55e,#4ade80)"
}}/>
</div>

{/* volume */}
<div style={label}>Volume</div>
<div style={bar}>
<div style={{
...barFill,
width:`${volumeBar}%`,
background:"linear-gradient(90deg,#3b82f6,#60a5fa)"
}}/>
</div>

{/* stats */}
<div style={stats}>
Swaps: {w?.swaps || 0} • 
Volume: ${Math.round(w?.volume || 0)}
</div>

{/* buttons */}
<div style={btnRow}>

<button
onClick={()=>copy(wallet)}
style={copyBtn}
>
Copy wallet
</button>

<button style={tradeBtn}>
🤖 Copy Trade
</button>

<Link href={`/wallet/${wallet}`} style={link}>
View profile
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
fontSize:30,
fontWeight:700,
marginBottom:4,
background:"linear-gradient(90deg,#22c55e,#4ade80)",
WebkitBackgroundClip:"text" as const,
color:"transparent"
}

const subtitle={
opacity:.6,
marginBottom:20
}

const card={
background:"rgba(2,6,23,.7)",
padding:16,
borderRadius:16,
marginBottom:14,
backdropFilter:"blur(10px)"
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
borderRadius:20
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

const copyBtn={
padding:"6px 12px",
borderRadius:8,
background:"#22c55e",
border:"none",
cursor:"pointer",
fontSize:12
}

const tradeBtn={
padding:"6px 12px",
borderRadius:8,
background:"#a855f7",
border:"none",
cursor:"pointer",
color:"#fff",
fontSize:12
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

const proBadge={
marginLeft:8,
background:"#22c55e",
color:"#020617",
padding:"2px 6px",
borderRadius:4,
fontSize:9,
fontWeight:700
}
