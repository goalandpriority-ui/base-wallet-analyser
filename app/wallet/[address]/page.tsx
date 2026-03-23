"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"

export default function WalletProfile(){

const params = useParams()
const address = params.address as string

const [data,setData]=useState<any>(null)
const [tokens,setTokens]=useState<any[]>([])
const [following,setFollowing]=useState(false)

useEffect(()=>{

fetch("/api/analyse-pro",{
method:"POST",
headers:{ "Content-Type":"application/json" },
body:JSON.stringify({wallet:address})
})
.then(res=>res.json())
.then(setData)

fetch("/api/wallet-tokens",{
method:"POST",
headers:{ "Content-Type":"application/json" },
body:JSON.stringify({wallet:address})
})
.then(res=>res.json())
.then(setTokens)

},[address])

const share = ()=>{
navigator.clipboard.writeText(window.location.href)
alert("Profile link copied")
}

const copyWallet = ()=>{
navigator.clipboard.writeText(address)
alert("Wallet copied")
}

const copyTrade = ()=>{
navigator.clipboard.writeText(address)
alert("Wallet copied for copy trading")
}

const follow = async ()=>{

const me = localStorage.getItem("lastWallet")

if(!me){
alert("Analyse wallet first")
return
}

await fetch("/api/follow",{
method:"POST",
headers:{
"Content-Type":"application/json"
},
body:JSON.stringify({
wallet:me,
followed:address
})
})

setFollowing(true)

}

const getTag = ()=>{
if(!data) return ""

if(data.tradingVolumeUSD > 100000) return "🐋 Whale"
if(data.swapCount > 500) return "⚡ Active Trader"
if(data.tradingDays > 30) return "🧠 Pro"

return "👤 Normal"
}

if(!data){
return <div style={{padding:20}}>Loading wallet...</div>
}

/* ---------- CALCULATIONS ---------- */

const totalWins = tokens.reduce((a,t)=>a+(t.wins||0),0)
const totalLoss = tokens.reduce((a,t)=>a+(t.losses||0),0)

const walletWinRate =
(totalWins+totalLoss)>0
? (totalWins/(totalWins+totalLoss))*100
: 0

const bestToken =
tokens.sort((a,b)=>b.winRate-a.winRate)[0]

const pnl =
tokens.reduce((a,t)=>a+(t.volume||0)*(t.winRate||0)/100,0)

/* ALERT */
useEffect(()=>{

if(walletWinRate > 70){
setTimeout(()=>{
alert("🔥 High win rate trader detected")
},1500)
}

},[walletWinRate])

return(
<div style={{padding:20,maxWidth:900,margin:"auto"}}>

{/* header */}
<div style={card}>

<div style={{fontSize:12,opacity:0.6}}>Wallet</div>

<div style={{fontSize:18,wordBreak:"break-all"}}>
{address}
</div>

<div style={{marginTop:6,fontSize:12,opacity:0.7}}>
{getTag()}
</div>

<div style={{display:"flex",gap:10,marginTop:10,flexWrap:"wrap"}}>

<button onClick={share} style={shareBtn}>
🔗 Share
</button>

<button onClick={copyWallet} style={copyBtn}>
📋 Copy
</button>

<button onClick={copyTrade} style={copyTradeBtn}>
🤖 Copy Trade
</button>

<button onClick={follow} style={followBtn}>
{following ? "⭐ Following" : "⭐ Follow"}
</button>

</div>

</div>

{/* wallet metrics */}
<div style={card}>

<h2>Wallet Performance</h2>

<div>🏆 Rank: #{data.rank}</div>
<div>⭐ Score: {Math.round(data.score)}</div>
<div>🔁 Swaps: {data.swapCount}</div>
<div>💰 Volume: ${Math.round(data.tradingVolumeUSD)}</div>
<div>📅 Trading Days: {data.tradingDays}</div>

<hr style={divider}/>

<div>📈 Win Rate: {walletWinRate.toFixed(1)}%</div>
<div>🥇 Best Token: {bestToken?.symbol || "-"}</div>
<div>💸 Est PnL: ${Math.round(pnl)}</div>

</div>

{/* activity */}
<div style={card}>

<h2>Activity</h2>

<div style={label}>Swap activity</div>
<div style={chart}>
<div style={{...bar,width:`${Math.min(data.swapCount,100)}%`}}/>
</div>

<div style={label}>Volume activity</div>
<div style={chart}>
<div style={{...bar2,width:`${Math.min(data.tradingVolumeUSD/10,100)}%`}}/>
</div>

<div style={label}>Experience</div>
<div style={chart}>
<div style={{...bar3,width:`${Math.min(data.tradingDays*2,100)}%`}}/>
</div>

</div>

{/* tokens */}
<div style={card}>

<h2>Top Tokens</h2>

{tokens.map((t,i)=>{

const color =
t.winRate > 60
? "#22c55e"
: t.winRate > 40
? "#facc15"
: "#ef4444"

return(

<div key={i} style={tokenRow}>

<div>
<div style={{fontWeight:600}}>
{t.symbol}
{bestToken?.symbol===t.symbol && " 🥇"}
</div>

<div style={sub}>
Buys {t.buys} | Sells {t.sells}
</div>
</div>

<div style={{textAlign:"right"}}>

<div style={{color,fontWeight:600}}>
{t.winRate?.toFixed(0)}%
</div>

<div style={sub}>
win rate
</div>

</div>

</div>

)
})}

</div>

{/* COPY TRADE SIGNAL */}
<div style={card}>

<h2>🤖 Copy Trade Signal</h2>

<div>
Best Token: {bestToken?.symbol}
</div>

<div>
Win Rate: {walletWinRate.toFixed(1)}%
</div>

<button style={copyTradeBtn}>
Copy Next Trade
</button>

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

const copyTradeBtn={
padding:"6px 12px",
borderRadius:8,
background:"#a855f7",
border:"none",
cursor:"pointer",
color:"#fff"
}

const followBtn={
padding:"6px 12px",
borderRadius:8,
background:"#facc15",
border:"none",
cursor:"pointer"
}

const chart={
height:8,
background:"#111",
borderRadius:20,
overflow:"hidden",
marginTop:6,
marginBottom:12
}

const bar={height:"100%",background:"#22c55e"}
const bar2={height:"100%",background:"#3b82f6"}
const bar3={height:"100%",background:"#a855f7"}

const label={fontSize:12,opacity:0.7}

const tokenRow={
display:"flex",
justifyContent:"space-between",
padding:"10px 0",
borderBottom:"1px solid #111"
}

const sub={fontSize:11,opacity:0.6}

const divider={
margin:"12px 0",
borderColor:"#111"
}
