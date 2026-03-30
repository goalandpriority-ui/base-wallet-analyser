"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"

export default function WalletProfile(){

const params = useParams()
const address = params?.address as string

const [data,setData]=useState<any>(null)
const [followers,setFollowers]=useState(0)
const [following,setFollowing]=useState(false)
const [followingCount,setFollowingCount]=useState(0)
const [paid,setPaid]=useState(false)

useEffect(()=>{

if(!address) return

const load = async()=>{

/* analyse */
try{
const res = await fetch("/api/analyse-pro",{
method:"POST",
headers:{ "Content-Type":"application/json" },
body:JSON.stringify({wallet:address})
})

const json = await res.json()
setData(json || {})
}catch{
setData({})
}

/* paid */
try{
const p = await fetch(`/api/check-paid?wallet=${address}`)
const pj = await p.json()
setPaid(pj?.paid)
}catch{}

/* follow */
try{
const f = await fetch(`/api/follow-count?wallet=${address}`)
const j = await f.json()

setFollowers(j.followers || 0)
setFollowingCount(j.following || 0)

}catch{}

}

load()

},[address])

const share = ()=>{
navigator.clipboard.writeText(window.location.href)
}

const copyWallet = ()=>{
navigator.clipboard.writeText(address)
}

const follow = async ()=>{

const me = localStorage.getItem("lastWallet")
if(!me) return

await fetch("/api/follow",{
method:"POST",
headers:{ "Content-Type":"application/json" },
body:JSON.stringify({
wallet:me,
followed:address
})
})

setFollowing(true)
}

if(!data){
return <div style={{padding:20}}>Loading...</div>
}

return(
<div style={{padding:20,maxWidth:900,margin:"auto"}}>

{/* header */}
<div style={card}>

<div style={{fontSize:12,opacity:.6}}>
Wallet
</div>

<div style={{
fontSize:18,
wordBreak:"break-all",
display:"flex",
alignItems:"center",
gap:8
}}>
{address}

{paid && (
<span style={proBadge}>
PRO
</span>
)}

</div>

<div style={{
display:"flex",
gap:14,
marginTop:6,
fontSize:12,
opacity:.8
}}>
<div>⭐ Followers: {followers}</div>
<div>➡️ Following: {followingCount}</div>
</div>

<div style={{display:"flex",gap:8,marginTop:10,flexWrap:"wrap"}}>
<button onClick={share} style={btnGreen}>Share</button>
<button onClick={copyWallet} style={btnBlue}>Copy</button>
<button onClick={follow} style={btnYellow}>
{following?"Following":"Follow"}
</button>
</div>

</div>

{/* WALLET STATS */}
<div style={card}>

<h3>Wallet Stats</h3>

<div>📊 Transactions: {data?.txCount || 0}</div>
<div>💰 Transfer Volume: {data?.transferVolume || 0} ETH</div>
<div>⛽ Gas: {data?.gasUsed || 0} ETH</div>
<div>📅 Active Days: {data?.activeDays || 0}</div>

</div>

{/* TRADING STATS */}
<div style={card}>

<h3>Trading Stats</h3>

<div>🔁 Swaps: {data?.swapCount || 0}</div>
<div>💎 Trading Volume: ${Math.round(data?.tradingVolumeUSD || 0)}</div>
<div>📅 Trading Days: {data?.tradingDays || 0}</div>
<div>⛽ Trading Gas: {data?.tradingGas || 0} ETH</div>

</div>

{/* PERFORMANCE */}
<div style={card}>

<h3>Performance</h3>

<div>🏆 Rank: #{data?.rank || "-"}</div>
<div>⭐ Score: {Math.round(data?.score || 0)}</div>

</div>

</div>
)
}

/* styles */

const proBadge={
background:"#22c55e",
color:"#020617",
padding:"2px 8px",
borderRadius:6,
fontSize:10,
fontWeight:700
}

const card={
background:"#020617",
padding:20,
borderRadius:12,
marginBottom:14,
border:"1px solid #111"
}

const btnGreen={
padding:"6px 12px",
background:"#22c55e",
border:"none",
borderRadius:8
}

const btnBlue={
padding:"6px 12px",
background:"#3b82f6",
border:"none",
borderRadius:8,
color:"#fff"
}

const btnYellow={
padding:"6px 12px",
background:"#facc15",
border:"none",
borderRadius:8
}
