"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"

export default function WalletProfile(){

const params = useParams()
const address = params.address as string

const [data,setData]=useState<any>(null)

useEffect(()=>{

fetch("/api/analyse-pro",{
method:"POST",
headers:{
"Content-Type":"application/json"
},
body:JSON.stringify({wallet:address})
})
.then(res=>res.json())
.then(setData)

},[address])

const share = ()=>{
const url = window.location.href
navigator.clipboard.writeText(url)
alert("Profile link copied")
}

const copyWallet = ()=>{
navigator.clipboard.writeText(address)
alert("Wallet copied")
}

const getTag = ()=>{
if(!data) return ""

if(data.tradingVolumeUSD > 100000) return "🐋 Whale"
if(data.swapCount > 500) return "⚡ Active Trader"
if(data.tradingDays > 30) return "🧠 Pro"

return "👤 Normal"
}

if(!data){
return(
<div style={{padding:20}}>
Loading wallet...
</div>
)
}

return(
<div style={{padding:20,maxWidth:800,margin:"auto"}}>

{/* header */}
<div style={card}>

<div style={{fontSize:12,opacity:0.6}}>
Wallet
</div>

<div style={{
fontSize:18,
wordBreak:"break-all"
}}>
{address}
</div>

<div style={{marginTop:6,fontSize:12,opacity:0.7}}>
{getTag()}
</div>

<div style={{display:"flex",gap:10,marginTop:10}}>

<button onClick={share} style={shareBtn}>
🔗 Share Profile
</button>

<button onClick={copyWallet} style={copyBtn}>
📋 Copy Wallet
</button>

</div>

</div>

{/* stats */}
<div style={card}>

<h2>Stats</h2>

<div>🏆 Rank: #{data.rank}</div>
<div>⭐ Score: {Math.round(data.score)}</div>
<div>🔁 Swaps: {data.swapCount}</div>
<div>💰 Volume: ${Math.round(data.tradingVolumeUSD)}</div>
<div>📅 Trading Days: {data.tradingDays}</div>

</div>

{/* activity chart */}
<div style={card}>

<h2>Activity</h2>

<div style={label}>Swap activity</div>

<div style={chart}>
<div style={{
width:`${Math.min(data.swapCount,100)}%`
}} className="bar"/>
</div>

<div style={label}>Volume activity</div>

<div style={chart}>
<div style={{
width:`${Math.min(data.tradingVolumeUSD/10,100)}%`
}} className="bar2"/>
</div>

<div style={label}>Experience</div>

<div style={chart}>
<div style={{
width:`${Math.min(data.tradingDays*2,100)}%`
}} className="bar3"/>
</div>

</div>

</div>
)
}

const card={
background:"#020617",
padding:20,
borderRadius:14,
marginBottom:15,
border:"1px solid #0f172a"
}

const shareBtn={
padding:"6px 12px",
borderRadius:8,
background:"#22c55e",
border:"none",
cursor:"pointer"
}

const copyBtn={
padding:"6px 12px",
borderRadius:8,
background:"#3b82f6",
border:"none",
cursor:"pointer",
color:"#fff"
}

const chart={
height:8,
background:"#111",
borderRadius:20,
overflow:"hidden",
marginTop:6,
marginBottom:12
}

const label={
fontSize:12,
opacity:0.7
}
