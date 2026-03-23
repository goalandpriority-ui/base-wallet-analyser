"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"

export default function WalletProfile(){

const params = useParams()
const address = params?.address as string

const [data,setData]=useState<any>(null)
const [tokens,setTokens]=useState<any[]>([])
const [following,setFollowing]=useState(false)

/* fetch */

useEffect(()=>{

if(!address) return

const load = async()=>{

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

try{

const t = await fetch("/api/wallet-tokens",{
method:"POST",
headers:{ "Content-Type":"application/json" },
body:JSON.stringify({wallet:address})
})

const j = await t.json()
setTokens(Array.isArray(j)?j:[])

}catch{
setTokens([])
}

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

/* calculations */

const totalWins =
tokens.reduce((a,t)=>a+(t?.wins||0),0)

const totalLoss =
tokens.reduce((a,t)=>a+(t?.losses||0),0)

const walletWinRate =
(totalWins+totalLoss)>0
? (totalWins/(totalWins+totalLoss))*100
: 0

const bestToken =
tokens.length
? [...tokens].sort(
(a,b)=>(b?.winRate||0)-(a?.winRate||0)
)[0]
: null

const pnl =
tokens.reduce(
(a,t)=>a+(t?.volume||0)*(t?.winRate||0)/100,
0
)

if(!data){
return <div style={{padding:20}}>Loading...</div>
}

return(
<div style={{padding:20,maxWidth:900,margin:"auto"}}>

{/* header */}
<div style={card}>

<div style={{fontSize:12,opacity:.6}}>Wallet</div>

<div style={{fontSize:18,wordBreak:"break-all"}}>
{address}
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
<div>Est PnL: ${Math.round(pnl)}</div>

</div>

{/* tokens */}
<div style={card}>

<h3>Top Tokens</h3>

{tokens.map((t,i)=>(

<div key={i} style={row}>

<div>
{t?.symbol || "TOKEN"}
{bestToken?.symbol===t?.symbol && " 🥇"}
</div>

<div>
{Math.round(t?.winRate || 0)}%
</div>

</div>

))}

</div>

{/* copy trade */}
<div style={card}>

<h3>Copy Trade Signal</h3>

<div>Best Token: {bestToken?.symbol || "-"}</div>
<div>Win Rate: {walletWinRate.toFixed(1)}%</div>

<button style={btnPurple}>
Copy Next Trade
</button>

</div>

</div>
)
}

const card={
background:"#020617",
padding:20,
borderRadius:12,
marginBottom:14,
border:"1px solid #111"
}

const row={
display:"flex",
justifyContent:"space-between",
padding:"8px 0",
borderBottom:"1px solid #111"
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
