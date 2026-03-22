"use client"

import { useEffect, useState } from "react"
import Link from "next/link"

export default function Leaderboard(){

const [data,setData]=useState<any[]>([])
const [page,setPage]=useState(1)
const [rank,setRank]=useState<number|null>(null)

const wallet =
typeof window !== "undefined"
? localStorage.getItem("lastWallet")
: null

useEffect(()=>{

fetch(`/api/leaderboard?page=${page}&wallet=${wallet||""}`)
.then(res=>res.json())
.then(res=>{
setData(res.data || [])
setRank(res.yourRank)
})

},[page])

const getBadge = (position:number)=>{

if(position===1) return "🥇"
if(position===2) return "🥈"
if(position===3) return "🥉"
if(position<=100) return "🏅"
if(position<=1000) return "⭐"

return ""
}

const getTag = (w:any)=>{

if(w.volume > 100000) return "🐋 Whale"
if(w.swaps > 500) return "⚡ Trader"
if(w.days > 30) return "🧠 Pro"

return ""
}

return(
<div style={{padding:20}}>

<Link href="/">← Back to Home</Link>

<h1 style={{fontSize:30,fontWeight:700}}>
🏆 Leaderboard
</h1>

{/* your rank */}

{rank && (
<div style={{
background:"#000",
color:"#00ff9c",
padding:15,
borderRadius:10,
marginBottom:20
}}>
Your Rank: #{rank}
</div>
)}

{/* list */}

{data.map((w,i)=>{

const position = (page-1)*1000+i+1
const isYou =
wallet &&
w.wallet.toLowerCase() === wallet.toLowerCase()

return(

<div
key={i}
style={{
background: isYou ? "#06281c" : "#0b0b0b",
color:"#00ff9c",
padding:14,
borderRadius:10,
marginBottom:8,
border: isYou ? "1px solid #00ff9c" : "1px solid #111"
}}
>

<div style={{
display:"flex",
justifyContent:"space-between"
}}>

<div>
{getBadge(position)} #{position}
</div>

<div>
{getTag(w)}
</div>

</div>

<div style={{
fontSize:13,
opacity:0.8
}}>
{w.wallet}
</div>

<div style={{
marginTop:4,
fontSize:12
}}>
Score: {Math.round(w.score)} |
Swaps: {w.swaps} |
Vol: ${Math.round(w.volume)}
</div>

</div>

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
