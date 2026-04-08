"use client"

import { useEffect, useState } from "react"
import Link from "next/link"

export default function Leaderboard(){

const [data,setData]=useState<any[]>([])
const [page,setPage]=useState(1)
const [rank,setRank]=useState<number|null>(null)
const [search,setSearch]=useState("")

const [stats,setStats]=useState<any>({
wallets:0,
swaps:0,
volume:0,
live:[]
})

const wallet =
typeof window !== "undefined"
? localStorage.getItem("lastWallet")
: null

const load = ()=>{

fetch(`/api/leaderboard?page=${page}&wallet=${wallet||""}`,{
cache:"no-store"
})
.then(res=>res.json())
.then(res=>{

const mapped = (res.data || []).map((w:any)=>({
...w,
swaps: w.swapcount ?? w.swaps ?? 0,
volume: w.tradingvolumeusd ?? w.volume ?? 0,
days: w.tradingdays ?? w.days ?? 0
}))

setData(mapped)
setRank(res.yourRank)

if(res.live){
setStats((prev:any)=>({
...prev,
live: res.live
}))
}

})

}

useEffect(()=>{
load()
const i=setInterval(load,5000)
return ()=>clearInterval(i)
},[page])

useEffect(()=>{

fetch("/api/stats",{cache:"no-store"})
.then(res=>res.json())
.then(res=>{

setStats((prev:any)=>({
...prev,
wallets: res.wallets || 0,
swaps: res.swaps || 0,
volume: res.volume || 0
}))

})

},[])

const jumpToRank = ()=>{
if(!rank) return
const targetPage = Math.ceil(rank / 20)
setPage(targetPage)
}

const searchWallet = ()=>{
if(!search) return

fetch(`/api/leaderboard?wallet=${search}`,{
cache:"no-store"
})
.then(res=>res.json())
.then(res=>{
if(res.yourRank){
const p = Math.ceil(res.yourRank / 20)
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

/* DISPLAY NAME */
const getName = (w:any)=>{

const u = (w.username || "").trim()

/* valid username */
if(
u &&
!u.startsWith("0x") &&
!u.includes("...") &&
u.length > 2
){
return u
}

/* fallback */
return (
w.wallet.slice(0,6) +
"..." +
w.wallet.slice(-4)
)

}

return(
<div style={{padding:20}}>

<h1 style={{fontSize:30,fontWeight:700}}>
🏆 Leaderboard
</h1>

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
🔥 Live Activity
</div>

{stats.live?.map((w:any,i:number)=>(
<Link
key={i}
href={`/wallet/${w.wallet}`}
style={{display:"block",marginTop:4}}
>
#{i+1} {getName(w)}
</Link>
))}

</div>

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

{data.map((w,i)=>{

const position = (page-1)*20+i+1

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
border:"1px solid #111"
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
fontSize:15,
fontWeight:600,
marginTop:4
}}>
{getName(w)}
</div>

<div style={{
fontSize:12,
opacity:0.6
}}>
{w.wallet.slice(0,6)}...{w.wallet.slice(-4)}
</div>

<div style={{
marginTop:4,
fontSize:12
}}>
Score: {Math.round(w.score)} |
Swaps: {w.swaps} |
Vol: ${Math.round(w.volume)}
</div>

<div style={{marginTop:8}}>
<Link href={`/wallet/${w.wallet}`}>
<button style={viewBtn}>
View Wallet Profile
</button>
</Link>
</div>

</div>

)
})}

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

const viewBtn={
padding:"6px 12px",
background:"#22c55e",
border:"none",
borderRadius:8,
color:"#020617",
fontWeight:600,
cursor:"pointer"
}
