"use client"

import { useEffect, useState } from "react"
import { sdk } from "@farcaster/miniapp-sdk"

export default function Home() {

const [wallet,setWallet]=useState("")
const [data,setData]=useState<any>(null)
const [loading,setLoading]=useState(false)
const [paid,setPaid]=useState(false)
const [connecting,setConnecting]=useState(true)

/* ---------------- FARCASTER CONNECT ---------------- */

useEffect(()=>{

const init = async()=>{

try{

await sdk.actions.ready()

const context:any = await sdk.context

const userWallet =
context?.user?.verifiedAddresses?.ethAddresses?.[0]

if(userWallet){
setWallet(userWallet)
localStorage.setItem("lastWallet",userWallet)
checkPaid(userWallet)
setConnecting(false)
return
}

}catch{}

connectBrowserWallet()

}

init()

},[])

/* ---------------- BROWSER WALLET AUTO CONNECT ---------------- */

const connectBrowserWallet = async()=>{

try{

const eth = (window as any).ethereum

if(!eth){
setConnecting(false)
return
}

const accounts = await eth.request({
method:"eth_accounts"
})

if(accounts?.[0]){
setWallet(accounts[0])
localStorage.setItem("lastWallet",accounts[0])
checkPaid(accounts[0])
}

}catch{}

setConnecting(false)

}

/* ---------------- MANUAL CONNECT ---------------- */

const connectWallet = async()=>{

try{

const eth = (window as any).ethereum

if(!eth){
alert("Wallet not found")
return
}

const accounts = await eth.request({
method:"eth_requestAccounts"
})

const addr = accounts[0]

setWallet(addr)
localStorage.setItem("lastWallet",addr)
checkPaid(addr)

}catch{
alert("Wallet connect failed")
}

}

/* ---------------- CHECK PAYMENT ---------------- */

const checkPaid = async (addr?:string)=>{

const w = addr || wallet
if(!w) return

const res = await fetch(`/api/check-paid?wallet=${w}`)
const json = await res.json()

setPaid(json.paid)

}

/* ---------------- PAY ---------------- */

const pay = async()=>{

try{

let tx:any = null

/* FARCASTER */
try{
tx = await (sdk as any).wallet.sendTransaction({
chainId:8453,
to:process.env.NEXT_PUBLIC_PAY_TO!,
value:"0x5af3107a4000"
})
}catch{}

/* BROWSER WALLET */
if(!tx){

const eth = (window as any).ethereum

tx = await eth.request({
method:"eth_sendTransaction",
params:[{
from:wallet,
to:process.env.NEXT_PUBLIC_PAY_TO!,
value:"0x5af3107a4000"
}]
})

}

if(tx){

await fetch("/api/mark-paid",{
method:"POST",
headers:{
"Content-Type":"application/json"
},
body:JSON.stringify({wallet})
})

setPaid(true)

/* FARCASTER CAST */
try{
await (sdk as any).actions.composeCast({
text:`🔥 Wallet analysed

Address: ${wallet}

Open miniapp to view full stats`
})
}catch{}

}

}catch{

alert("Payment failed")

}

}

/* ---------------- ANALYSE ---------------- */

const analyse = async()=>{

if(!paid){
alert("Pay 0.000025 ETH to analyse")
return
}

setLoading(true)
setData(null)

try{

localStorage.setItem("lastWallet",wallet)

const [basicRes,proRes] = await Promise.all([

fetch("/api/analyse",{
method:"POST",
body:JSON.stringify({wallet})
}),

fetch("/api/analyse-pro",{
method:"POST",
body:JSON.stringify({wallet})
})

])

const basicData = await basicRes.json()
const proData = await proRes.json()

setData({
...basicData,
...proData
})

}catch{

alert("Error analysing wallet")

}

setLoading(false)

}

return(
<main style={{
padding:20,
fontFamily:"system-ui",
maxWidth:700,
margin:"auto"
}}>

{/* HEADER */}
<div style={header}>

<div style={glow}/>

<div style={{
display:"flex",
alignItems:"center",
gap:14
}}>

<div style={icon}>⚡</div>

<div>
<h1 style={title}>Base Wallet Analyser</h1>
<div style={subtitle}>
Analyse wallets on Base network
</div>
</div>

</div>
</div>

{/* WALLET CARD */}
<div style={card}>

<div style={{fontSize:12,opacity:.6}}>
Connected Wallet
</div>

<div style={{
display:"flex",
alignItems:"center",
gap:8,
marginTop:4
}}>

<div style={{wordBreak:"break-all"}}>
{connecting
? "Connecting..."
: wallet || "No wallet"}
</div>

{paid && <div style={proBadge}>PRO</div>}

{!wallet && !connecting && (
<button onClick={connectWallet} style={connectBtn}>
Connect
</button>
)}

</div>

</div>

{/* PAYMENT */}
{!paid && wallet && (
<div style={payCard}>
<div>🔒 Pay 0.000025 ETH to unlock wallet analytics</div>
<button onClick={pay} style={payBtn}>
Pay & Unlock
</button>
</div>
)}

{/* ANALYSE */}
{paid && (
<button onClick={analyse} style={analyseBtn}>
{loading ? "Analysing..." : "Analyse Wallet"}
</button>
)}

<br/><br/>

{/* RESULTS */}
{data && !data.error && (
<div style={result}>

<p>📊 Transactions: {data.totalTxns || 0}</p>
<p>💰 Transfer Volume: {data.totalVolumeETH || 0} ETH</p>
<p>⛽ Gas: {data.totalGasETH || 0} ETH</p>
<p>📅 Active Days: {data.activeDays || 0}</p>

<hr style={divider}/>

<p>🔁 Swaps: {data.swapCount || 0}</p>
<p>💎 Trading Volume: ${data.tradingVolumeUSD ?? 0}</p>
<p>📅 Trading Days: {data.tradingDays || 0}</p>
<p>⛽ Trading Gas: {data.tradingGasETH || 0} ETH</p>

<hr style={divider}/>

<p>🏆 Rank: #{data.rank || "-"}</p>
<p>⭐ Score: {data.score || 0}</p>

</div>
)}

</main>
)

}

/* styles */

const header={background:"linear-gradient(135deg,#020617,#020617,#001a1a)",padding:24,borderRadius:18,marginBottom:25,border:"1px solid rgba(34,197,94,0.2)",boxShadow:"0 0 60px rgba(34,197,94,0.08)",position:"relative" as const,overflow:"hidden"}

const glow={position:"absolute" as const,width:200,height:200,background:"radial-gradient(circle,#22c55e33,transparent)",top:-60,right:-60,filter:"blur(40px)"}

const icon={fontSize:34}

const title={fontSize:28,fontWeight:700,margin:0}

const subtitle={fontSize:13,color:"#9ca3af",marginTop:4}

const card={background:"#020617",padding:14,borderRadius:10,border:"1px solid #111",marginBottom:10}

const payCard={background:"#111",padding:16,borderRadius:12,marginBottom:15,border:"1px solid #22c55e"}

const payBtn={marginTop:10,padding:"8px 16px",borderRadius:8,background:"#22c55e",border:"none"}

const analyseBtn={padding:"12px 24px",borderRadius:10,border:"1px solid #22c55e",background:"linear-gradient(90deg,#16a34a,#22c55e)",color:"#022c22",fontWeight:600}

const result={background:"rgba(2,6,23,0.8)",color:"#00ff9c",padding:20,borderRadius:14,marginTop:10}

const divider={margin:"15px 0",borderColor:"#0f172a"}

const proBadge={background:"#22c55e",color:"#020617",padding:"2px 8px",borderRadius:6,fontSize:10,fontWeight:700}

const connectBtn={marginLeft:8,padding:"3px 10px",borderRadius:6,background:"#22c55e",border:"none",fontSize:11}
