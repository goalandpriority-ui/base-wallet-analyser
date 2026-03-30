"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"

export default function WalletProfile(){

const params = useParams()
const address = params?.address as string

const [data,setData]=useState<any>(null)
const [tokens,setTokens]=useState<any[]>([])
const [following,setFollowing]=useState(false)
const [paid,setPaid]=useState(false)

const [followers,setFollowers]=useState(0)
const [followingCount,setFollowingCount]=useState(0)

const [lastSwap,setLastSwap]=useState<any>(null)
const [activeToken,setActiveToken]=useState<any>(null)

/* fetch */

useEffect(()=>{

if(!address) return

const load = async()=>{

/* analyse */
try{

const a = await fetch("/api/analyse-pro",{
method:"POST",
headers:{ "Content-Type":"application/json" },
body:JSON.stringify({wallet:address})
})

const d = await a.json()
setData(d || {})

}catch{
setData({})
}

/* REAL TRADES */
try{

const t = await fetch("/api/wallet-trades",{
method:"POST",
headers:{ "Content-Type":"application/json" },
body:JSON.stringify({wallet:address})
})

const arr = await t.json()

setTokens(arr || [])

/* last trade */
if(arr?.length){
setLastSwap(arr[0])
}

/* active position */
const active =
arr.find((t:any)=> !t.sellUsd)

if(active) setActiveToken(active)

}catch{
setTokens([])
}

/* check paid */
try{
const p = await fetch(`/api/check-paid?wallet=${address}`)
const pj = await p.json()
setPaid(pj?.paid)
}catch{}

/* follow stats */
try{
const f = await fetch(`/api/follow-count?wallet=${address}`)
const j = await f.json()

setFollowers(j.followers || 0)
setFollowingCount(j.following || 0)

}catch{}

}

load()

},[address])

/* actions */

const share = ()=>{
navigator.clipboard.writeText(window.location.href)
}

const copyWallet = ()=>{
navigator.clipboard.writeText(address)
}

const copyTrade = ()=>{
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

/* stats */

const pnl =
tokens.reduce(
(a,t)=>a+(t?.pnl||0),
0
)

const wins =
tokens.filter(t=>t?.pnl>0).length

const losses =
tokens.filter(t=>t?.pnl<0).length

const walletWinRate =
(wins+losses)>0
? (wins/(wins+losses))*100
: 0

const bestToken =
tokens.length
? [...tokens].sort(
(a,b)=>(b?.pnl||0)-(a?.pnl||0)
)[0]
: null

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
<button onClick={copyTrade} style={btnPurple}>Copy Trade</button>

<button onClick={follow} style={btnYellow}>
{following?"Following":"Follow"}
</button>

</div>

</div>

{/* ACTIVE POSITION */}
<div style={card}>
<h3>🟢 Current Position</h3>

{activeToken ? (
<>
<div>Token: {activeToken.symbol}</div>
<div>Buy: ${Math.round(activeToken.buyUsd)}</div>

<div style={{fontSize:12,opacity:.6}}>
{activeToken.time}
</div>
</>
):"No active trades"}

</div>

{/* LAST TRADE */}
<div style={card}>
<h3>🔁 Last Trade</h3>

{lastSwap ? (
<>
<div>Token: {lastSwap.symbol}</div>
<div>Buy: ${Math.round(lastSwap.buyUsd)}</div>
<div>Sell: ${Math.round(lastSwap.sellUsd)}</div>

<div style={{
color:lastSwap.pnl>=0
? "#22c55e"
: "#ef4444"
}}>
PnL: ${Math.round(lastSwap.pnl)}
</div>

<div style={{fontSize:12,opacity:.6}}>
{lastSwap.time}
</div>
</>
):"No swaps"}

</div>

{/* stats */}
<div style={card}>

<h3>Wallet Performance</h3>

<div>Rank: #{data?.rank || "-"}</div>
<div>Score: {Math.round(data?.score || 0)}</div>
<div>Swaps: {data?.swapCount || 0}</div>
<div>Volume: ${Math.round(data?.tradingVolumeUSD || 0)}</div>

<hr style={divider}/>

<div>Win Rate: {walletWinRate.toFixed(1)}%</div>
<div>Best Token: {bestToken?.symbol || "-"}</div>
<div>Total PnL: ${Math.round(pnl)}</div>

</div>

{/* trades */}
<div style={card}>

<h3>Trade History</h3>

{tokens.map((t,i)=>(

<div key={i} style={{
padding:"10px 0",
borderBottom:"1px solid #111"
}}>

<div style={{fontWeight:600}}>
{t.symbol}
{bestToken?.symbol===t?.symbol && " 🥇"}
</div>

<div style={{fontSize:12}}>
Buy: ${Math.round(t.buyUsd)} → 
Sell: ${Math.round(t.sellUsd)}
</div>

<div style={{fontSize:12}}>
Entry: {t.entry} | Exit: {t.exit}
</div>

<div style={{
color: t.pnl >= 0 ? "#22c55e" : "#ef4444",
fontSize:12
}}>
PnL: ${Math.round(t.pnl)} ({t.pnlPercent?.toFixed(1)}%)
</div>

<div style={{fontSize:11,opacity:.6}}>
{t.time}
</div>

</div>

))}

</div>

{/* copy trade */}
<div style={card}>

<h3>🤖 Copy Trade Signal</h3>

<div>Best Token: {bestToken?.symbol || "-"}</div>
<div>Win Rate: {walletWinRate.toFixed(1)}%</div>

<button style={btnPurple}>
Copy Next Trade
</button>

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

const divider={
margin:"10px 0",
borderColor:"#111"
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

const btnPurple={
padding:"6px 12px",
background:"#a855f7",
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
