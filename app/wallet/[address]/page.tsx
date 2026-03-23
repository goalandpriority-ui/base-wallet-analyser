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

<button onClick={share} style={shareBtn}>
🔗 Share Profile
</button>

</div>

{/* stats */}
<div style={card}>

<h2>Stats</h2>

<div>🏆 Rank: #{data.rank}</div>
<div>⭐ Score: {data.score}</div>
<div>🔁 Swaps: {data.swapCount}</div>
<div>💰 Volume: ${Math.round(data.tradingVolumeUSD)}</div>
<div>📅 Trading Days: {data.tradingDays}</div>

</div>

{/* chart */}
<div style={card}>

<h2>Activity</h2>

<div style={chart}>
<div style={{
width:`${Math.min(data.swapCount,100)}%`
}} className="bar"/>
</div>

<div style={{fontSize:12,opacity:0.7}}>
Swap activity
</div>

<div style={chart}>
<div style={{
width:`${Math.min(data.tradingVolumeUSD/10,100)}%`
}} className="bar2"/>
</div>

<div style={{fontSize:12,opacity:0.7}}>
Volume activity
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
marginTop:10,
padding:"6px 12px",
borderRadius:8,
background:"#22c55e",
border:"none",
cursor:"pointer"
}

const chart={
height:8,
background:"#111",
borderRadius:20,
overflow:"hidden",
marginTop:10,
marginBottom:5
}
