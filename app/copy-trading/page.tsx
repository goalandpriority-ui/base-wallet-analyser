"use client"

import { useEffect, useState } from "react"
import Link from "next/link"

/* COPY SETTINGS */
const copySettings = {
enabled: true,
copyPercent: 10,
maxBuyEth: 0.02,
stopLoss: 20,
whitelist: [],
blacklist: []
}

export default function CopyTrading(){

const [data,setData]=useState<any[]>([])
const [copied,setCopied]=useState<string | null>(null)
const [active,setActive]=useState<string | null>(null)

/* LOAD */
useEffect(()=>{

const load = async()=>{

try{
const res = await fetch("/api/top-traders")
const json = await res.json()

let rows:any[] = []

if(Array.isArray(json)) rows = json
else rows = json?.data || []

const mapped = rows.map((w:any)=>({
...w,
swaps: w.swapCount || 0,
volume: w.tradingVolumeUSD || 0
}))

setData(mapped)

}catch{
setData([])
}

}

load()

},[])

/* AUTO BOT */
useEffect(()=>{

const trader = localStorage.getItem("copyTrader")
if(trader) setActive(trader)

const interval = setInterval(runCopyBot,10000)

return ()=> clearInterval(interval)

},[])

/* TOKEN FILTER */
const isAllowedToken = (token:string)=>{

if(copySettings.blacklist.includes(token))
return false

if(
copySettings.whitelist.length &&
!copySettings.whitelist.includes(token)
)
return false

return true
}

/* COPY AMOUNT */
const getCopyAmount = (amount:number)=>{

let copy =
amount * (copySettings.copyPercent/100)

if(copy > copySettings.maxBuyEth)
copy = copySettings.maxBuyEth

return copy
}

/* STOP LOSS */
const checkStopLoss = async(token:string)=>{
console.log("Checking stop loss for",token)
}

/* AUTO COPY BOT */
const runCopyBot = async()=>{

if(!copySettings.enabled) return

const trader = localStorage.getItem("copyTrader")
if(!trader) return

try{

const res = await fetch("/api/analyse-pro",{
method:"POST",
headers:{
"Content-Type":"application/json"
},
body:JSON.stringify({wallet: trader})
})

const swap = await res.json()

const hash =
swap?.lastSwapHash ||
swap?.hash ||
JSON.stringify(swap)

const last = localStorage.getItem("lastSwap")

if(last === hash) return

localStorage.setItem("lastSwap",hash)

const amount = getCopyAmount(
swap?.amountEth || 0.01
)

console.log("Copy trade",{
trader,
amount
})

if(swap?.tokenOut){
if(!isAllowedToken(swap.tokenOut))
return

checkStopLoss(swap.tokenOut)
}

}catch{}

}

/* COPY WALLET */
const copy = (wallet:string)=>{
navigator.clipboard.writeText(wallet || "")
}

/* COPY TRADE */
const copyTrade = (wallet:string)=>{

localStorage.setItem("copyTrader",wallet)
localStorage.removeItem("lastSwap")

setCopied(wallet)
setActive(wallet)

setTimeout(()=>setCopied(null),1500)

}

/* STOP */
const stopCopy = ()=>{
localStorage.removeItem("copyTrader")
localStorage.removeItem("lastSwap")
setActive(null)
}

/* TAG */
const getTag = (w:any)=>{

if((w?.volume||0) > 100000) return "🐋 Whale"
if((w?.swaps||0) > 500) return "⚡ Pro Trader"
if((w?.score||0) > 5000) return "💎 Alpha"

return "📈 Trader"
}

return(

<div style={wrap}>
<h1 style={title}>
🤖 Copy Trading PRO
</h1>

<div style={subtitle}>
Follow top wallets and auto copy trades
</div>

{active && (
<div style={activeBox}>
🟢 Auto copying: {active.slice(0,6)}...{active.slice(-4)}
<button onClick={stopCopy} style={stopBtn}>
Stop
</button>
</div>
)}

{data.length === 0 && (
<div style={{opacity:.6}}>No traders found</div>
)}

{data.map((w,i)=>{

const wallet = w?.wallet || "unknown"

const winRate =
Math.min((w?.score || 0) / 100,100)

const volumeBar =
Math.min((w?.volume || 0) / 1000,100)

const isPaid = w?.paid

return(

<div
key={i}
style={{
...card,
border:isPaid
? "1px solid #22c55e"
: "1px solid #0f172a",
boxShadow:isPaid
? "0 0 15px rgba(34,197,94,.4)"
: "0 0 25px rgba(34,197,94,.15)"
}}
>

<div style={rowTop}>
<div>
#{i+1} {getTag(w)}
{isPaid && (
<span style={proBadge}>
PRO
</span>
)}
</div>

<div style={score}>
Score {Math.round(w?.score || 0)}
</div>
</div>

<div style={walletStyle}>
{wallet}
</div>

<div style={label}>Win Rate</div>
<div style={bar}>
<div style={{
...barFill,
width:`${winRate}%`,
background:"linear-gradient(90deg,#22c55e,#4ade80)"
}}/>
</div>

<div style={label}>Volume</div>
<div style={bar}>
<div style={{
...barFill,
width:`${volumeBar}%`,
background:"linear-gradient(90deg,#3b82f6,#60a5fa)"
}}/>
</div>

<div style={stats}>
Swaps: {w?.swaps || 0} • 
Volume: ${Math.round(w?.volume || 0)}
</div>

<div style={btnRow}>

<button
onClick={()=>copy(wallet)}
style={copyBtn}
>
📋 Copy wallet
</button>

<button
onClick={()=>copyTrade(wallet)}
style={tradeBtn}
>
{copied === wallet
? "✓ Copied"
: active === wallet
? "🟢 Copying"
: "🤖 Copy Trade"}
</button>

<Link href={`/wallet/${wallet}`} style={link}>
View profile
</Link>

</div>
</div>
)

})}

</div>
)
}

/* styles */

const wrap={
padding:20,
maxWidth:800,
margin:"auto"
}

const title={
fontSize:30,
fontWeight:700,
marginBottom:4,
background:"linear-gradient(90deg,#22c55e,#4ade80)",
WebkitBackgroundClip:"text" as const,
color:"transparent"
}

const subtitle={
opacity:.6,
marginBottom:20
}

const activeBox={
background:"#020617",
border:"1px solid #22c55e",
padding:10,
borderRadius:10,
marginBottom:15,
display:"flex",
justifyContent:"space-between",
alignItems:"center"
}

const stopBtn={
background:"#ef4444",
border:"none",
padding:"4px 10px",
borderRadius:6,
color:"#fff",
cursor:"pointer"
}

const card={
background:"rgba(2,6,23,.7)",
padding:16,
borderRadius:16,
marginBottom:14,
backdropFilter:"blur(10px)"
}

const rowTop={
display:"flex",
justifyContent:"space-between",
marginBottom:6
}

const walletStyle={
fontSize:12,
opacity:.8,
wordBreak:"break-all" as const,
marginBottom:8
}

const score={
color:"#22c55e",
fontWeight:600
}

const label={
fontSize:11,
opacity:.6,
marginTop:6
}

const bar={
height:6,
background:"#111",
borderRadius:20,
overflow:"hidden",
marginTop:4
}

const barFill={
height:"100%",
borderRadius:20
}

const stats={
fontSize:11,
opacity:.6,
marginTop:8
}

const btnRow={
display:"flex",
gap:8,
marginTop:10
}

const copyBtn={
padding:"6px 12px",
borderRadius:8,
background:"#22c55e",
border:"none",
cursor:"pointer",
fontSize:12
}

const tradeBtn={
padding:"6px 12px",
borderRadius:8,
background:"#a855f7",
border:"none",
cursor:"pointer",
color:"#fff",
fontSize:12
}

const link={
padding:"6px 12px",
borderRadius:8,
background:"#020617",
border:"1px solid #1f2937",
textDecoration:"none",
color:"#22c55e",
fontSize:12
}

const proBadge={
marginLeft:8,
background:"#22c55e",
color:"#020617",
padding:"2px 6px",
borderRadius:4,
fontSize:9,
fontWeight:700
  }
