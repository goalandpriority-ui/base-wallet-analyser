"use client"

import { useEffect, useState } from "react"
import Link from "next/link"

export default function HighestVolume(){

const [data,setData]=useState<any[]>([])
const [page,setPage]=useState(1)
const [rank,setRank]=useState<number|null>(null)

const wallet =
typeof window !== "undefined"
? localStorage.getItem("lastWallet")
: null

useEffect(()=>{

fetch(`/api/highest-volume?page=${page}&wallet=${wallet||""}`)
.then(res=>res.json())
.then(res=>{

/* FIX FIELD NAMES */
const mapped = (res.data || []).map((w:any)=>({
...w,
volume: w.tradingVolumeUSD || 0,
swaps: w.swapCount || 0
}))

setData(mapped)
setRank(res.yourRank)

})

},[page])

return(
<div style={{padding:20}}>

<h1 style={{fontSize:30,fontWeight:700}}>
💰 Highest Volume
</h1>

{rank && (
<div style={{
background:"#000",
color:"#00ff9c",
padding:15,
borderRadius:10,
marginBottom:15
}}>
Your Rank: #{rank}
</div>
)}

{data.map((w,i)=>{

const position = (page-1)*1000+i+1
const isPaid = w?.paid

return(

<Link
key={i}
href={`/wallet/${w.wallet}`}
style={{textDecoration:"none"}}
>

<div
style={{
background:"#020617",
color:"#00ff9c",
padding:14,
borderRadius:10,
marginBottom:8,
border:isPaid
? "1px solid #22c55e"
: "1px solid #111",
boxShadow:isPaid
? "0 0 12px rgba(34,197,94,.4)"
: "none"
}}
>

<div style={{
display:"flex",
justifyContent:"space-between"
}}>

<div>
#{position}

{isPaid && (
<span style={badge}>
PRO
</span>
)}

</div>

<div>
${Math.round(w.volume)}
</div>

</div>

<div style={{
fontSize:13,
opacity:.8,
marginTop:4
}}>
{w.wallet}
</div>

<div style={{
fontSize:12,
marginTop:4
}}>
Score: {Math.round(w.score)} |
Swaps: {w.swaps}
</div>

</div>

</Link>

)
})}

{/* pagination */}

<div style={{
marginTop:20,
display:"flex",
gap:10
}}>

<button onClick={()=>setPage(p=>Math.max(1,p-1))}>
Prev
</button>

<div>
Page {page}
</div>

<button onClick={()=>setPage(p=>p+1)}>
Next
</button>

</div>

</div>
)
}

const badge={
marginLeft:8,
background:"#22c55e",
color:"#020617",
padding:"2px 6px",
borderRadius:4,
fontSize:9,
fontWeight:700
}
