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

if(Array.isArray(json)){
setData(json)
}else{
setData(json?.data || [])
}

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
if((w?.swaps||0) > 500) return "⚡ High Trader"
if((w?.score||0) > 5000) return "💎 Alpha"

return "📈 Trader"
}

return(
<div style={{
padding:20,
maxWidth:800,
margin:"auto"
}}>

<h1 style={{
fontSize:30,
fontWeight:700,
marginBottom:15
}}>
📋 Copy Trading
</h1>

<div style={{
opacity:0.7,
marginBottom:20
}}>
Follow top wallets and copy their trades
</div>

{data.length === 0 && (
<div style={{opacity:.6}}>
No traders found
</div>
)}

{data.map((w:any,i:number)=>{

const wallet = w?.wallet || "unknown"

return(

<div
key={i}
style={{
background:"#020617",
border:"1px solid #0f172a",
padding:16,
borderRadius:14,
marginBottom:12
}}
>

{/* top row */}
<div style={{
display:"flex",
justifyContent:"space-between",
marginBottom:6
}}>

<div>
#{i+1} {getTag(w)}
</div>

<div>
Score: {Math.round(w?.score || 0)}
</div>

</div>

{/* wallet */}
<div style={{
fontSize:13,
opacity:0.8,
wordBreak:"break-all",
marginBottom:8
}}>
{wallet}
</div>

{/* stats */}
<div style={{
fontSize:12,
opacity:0.7,
marginBottom:10
}}>
Swaps: {w?.swaps || 0} |
Volume: ${Math.round(w?.volume || 0)}
</div>

{/* buttons */}
<div style={{
display:"flex",
gap:8
}}>

<button
onClick={()=>copy(wallet)}
style={copyBtn}
>
Copy wallet
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

const copyBtn={
padding:"6px 12px",
borderRadius:8,
background:"#22c55e",
border:"none",
cursor:"pointer",
fontSize:12
}

const link={
padding:"6px 12px",
borderRadius:8,
background:"#111",
border:"1px solid #333",
textDecoration:"none",
color:"#00ff9c",
fontSize:12
  }
