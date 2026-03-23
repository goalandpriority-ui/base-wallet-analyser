"use client"

import { useEffect, useState } from "react"
import Link from "next/link"

export default function Leaderboard(){

const [data,setData]=useState<any[]>([])
const [page,setPage]=useState(1)
const [rank,setRank]=useState<number|null>(null)
const [search,setSearch]=useState("")
const [stats,setStats]=useState<any>(null)

const wallet =
typeof window !== "undefined"
? localStorage.getItem("lastWallet")
: null

const load = ()=>{

fetch(`/api/leaderboard?page=${page}&wallet=${wallet||""}`)
.then(res=>res.json())
.then(res=>{
setData(res.data || [])
setRank(res.yourRank)
})

}

// leaderboard refresh
useEffect(()=>{

load()

const i=setInterval(load,5000)
return ()=>clearInterval(i)

},[page])

// stats load
useEffect(()=>{

fetch("/api/stats")
.then(res=>res.json())
.then(setStats)

},[])

const jumpToRank = ()=>{

if(!rank) return
const targetPage = Math.ceil(rank / 1000)
setPage(targetPage)

}

const searchWallet = ()=>{

if(!search) return

fetch(`/api/leaderboard?wallet=${search}`)
.then(res=>res.json())
.then(res=>{
if(res.yourRank){
const p = Math.ceil(res.yourRank / 1000)
setPage(p)
}
})

}

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

<h1 style={{fontSize:30,fontWeight:700}}>
🏆 Leaderboard
</h1>

{/* GLOBAL STATS + TRENDING */}

{stats && (

<div style={{
background:"#000",
color:"#00ff9c",
padding:15,
borderRadius:10,
marginBottom:15
}}>

<div style={{fontWeight:700,marginBottom:10}}>
🌍 Global Stats
</div>

<div>Wallets: {stats.wallets}</div>
<div>Swaps: {stats.swaps}</div>
<div>Volume: ${Math.round(stats.volume)}</div>

<hr style={{margin:"10px 0",borderColor:"#222"}} />

<div style={{fontWeight:700}}>
⚡ Live Activity
</div>

{stats.trending?.map((w:any,i:number)=>(
<div key={i}>
#{i+1} {w.wallet}
</div>
))}

</div>

)}

{/* your rank */}

{rank && (
<div style={{
background:"#000",
color:"#00ff9c",
padding:15,
borderRadius:10,
marginBottom:15
}}>
Your Rank: #{rank}

<button
onClick={jumpToRank}
style={{marginLeft:10}}
>
Jump to my rank
</button>

</div>
)}

{/* search */}

<div style={{marginBottom:15}}>

<input
placeholder="Search wallet..."
value={search}
onChange={(e)=>setSearch(e.target.value)}
style={{padding:8,width:300}}
/>

<button onClick={searchWallet}>
Search
</button>

</div>

{/* list */}

{data.map((w,i)=>{

const position = (page-1)*1000+i+1
const isYou =
wallet &&
w.wallet.toLowerCase() === wallet.toLowerCase()

return(

<Link
key={i}
href={`/wallet/${w.wallet}`}
style={{textDecoration:"none"}}
>

<div
style={{
background: isYou ? "#06281c" : "#0b0b0b",
color:"#00ff9c",
padding:14,
borderRadius:10,
marginBottom:8,
border: isYou ? "1px solid #00ff9c" : "1px solid #111",
cursor:"pointer"
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
