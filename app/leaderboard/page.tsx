"use client"

import { useEffect, useState } from "react"
import Link from "next/link"

export default function Leaderboard(){

const [data,setData]=useState<any[]>([])
const [page,setPage]=useState(1)
const [rank,setRank]=useState<number|null>(null)

const wallet = typeof window !== "undefined"
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

return (
<div style={{padding:20}}>

<Link href="/">← Back to Home</Link>

<h1 style={{fontSize:32,fontWeight:"bold"}}>
🏆 Leaderboard
</h1>

{/* YOUR RANK */}
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

{/* LIST */}
{data.map((w,i)=>(
<div key={i}
style={{
background:"#111",
color:"#0f0",
padding:10,
marginBottom:6,
borderRadius:6
}}
>
#{(page-1)*1000+i+1} — {w.wallet}
</div>
))}

{/* pagination */}

<div style={{marginTop:20}}>

<button
onClick={()=>setPage(p=>Math.max(1,p-1))}
>
Prev
</button>

<span style={{margin:"0 10px"}}>
Page {page}
</span>

<button
onClick={()=>setPage(p=>p+1)}
>
Next
</button>

</div>

</div>
)
}
