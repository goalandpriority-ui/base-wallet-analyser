"use client"

import { useEffect, useState, CSSProperties } from "react"
import { sdk } from "@farcaster/miniapp-sdk"

export default function Home() {

const [wallet,setWallet]=useState("")
const [data,setData]=useState<any>(null)
const [loading,setLoading]=useState(false)
const [paid,setPaid]=useState(false)
const [connecting,setConnecting]=useState(true)

/* CONNECT */
useEffect(()=>{

const init = async()=>{

try{

await sdk.actions.ready()

let context:any = await sdk.context

let fcWallet =
context?.user?.wallet?.address ||
context?.user?.verifiedAddresses?.ethAddresses?.[0]

// force connect
if(!fcWallet){
try{
await sdk.wallet.connect()
context = await sdk.context

fcWallet =
context?.user?.wallet?.address ||
context?.user?.verifiedAddresses?.ethAddresses?.[0]
}catch{}
}

if(fcWallet){
const w = fcWallet.toLowerCase()
setWallet(w)
localStorage.setItem("lastWallet",w)
checkPaid(w)
setConnecting(false)
return
}

}catch(e){
console.log("Farcaster wallet not found")
}

try{

const eth = (window as any).ethereum

if(eth){

const acc = await eth.request({
method:"eth_accounts"
})

if(acc?.[0]){
const w = acc[0].toLowerCase()
setWallet(w)
localStorage.setItem("lastWallet",w)
checkPaid(w)
setConnecting(false)
return
}

}

}catch{}

const cached = localStorage.getItem("lastWallet")

if(cached){
setWallet(cached.toLowerCase())
checkPaid(cached.toLowerCase())
}

setConnecting(false)

}

init()

},[])

/* CONNECT BUTTON */
const connectWallet = async()=>{

try{

// farcaster connect
try{
await sdk.wallet.connect()
const context:any = await sdk.context
const addr =
context?.user?.wallet?.address ||
context?.user?.verifiedAddresses?.ethAddresses?.[0]

if(addr){
const w = addr.toLowerCase()
setWallet(w)
localStorage.setItem("lastWallet",w)
checkPaid(w)
return
}
}catch{}

const eth = (window as any).ethereum

if(!eth){
console.log("No wallet found")
return
}

const accounts = await eth.request({
method:"eth_requestAccounts"
})

const addr = accounts[0].toLowerCase()

setWallet(addr)
localStorage.setItem("lastWallet",addr)
checkPaid(addr)

}catch{
alert("Wallet connect failed")
}

}

/* CHECK PAID */
const checkPaid = async (addr?:string)=>{

const w = (addr || wallet)?.toLowerCase()
if(!w) return

const res = await fetch("/api/check-paid?wallet=${w}")
const json = await res.json()

setPaid(json.paid)

}

/* PAY */
const pay = async()=>{

try{

if(!wallet){
alert("Connect wallet first")
return
}

const eth = (window as any).ethereum

await eth.request({
method:"wallet_switchEthereumChain",
params:[{ chainId:"0x2105" }]
}).catch(()=>{})

const tx = await eth.request({
method:"eth_sendTransaction",
params:[{
from:wallet,
to:process.env.NEXT_PUBLIC_PAY_TO!,
value:"0x16bcc41e9000",
chainId:"0x2105"
}]
})

if(!tx){
alert("Payment failed")
return
}

const txHash = typeof tx === "string" ? tx : tx.hash

await new Promise(r=>setTimeout(r,2000))

const save = await fetch("/api/mark-paid",{
method:"POST",
headers:{
"Content-Type":"application/json"
},
body:JSON.stringify({
wallet: wallet.toLowerCase(),
txHash
})
})

const json = await save.json()

if(!json.ok){
alert("Payment save failed")
return
}

await checkPaid(wallet)
setPaid(true)

}catch(e){
console.log(e)
alert("Payment failed")
}

}

/* ANALYSE */
const analyse = async()=>{

if(!paid){
alert("Pay 0.000025 ETH to analyse")
return
}

setLoading(true)
setData(null)

try{

let currentWallet =
(localStorage.getItem("lastWallet") || wallet)?.toLowerCase()

if(!currentWallet){
try{
const context:any = await sdk.context
currentWallet =
context?.user?.wallet?.address ||
context?.user?.verifiedAddresses?.ethAddresses?.[0]
}catch{}
}

if(!currentWallet){
console.log("No wallet found")
setLoading(false)
return
}

setWallet(currentWallet)

const basicRes = await fetch("/api/analyse",{
method:"POST",
headers:{
"Content-Type":"application/json"
},
body:JSON.stringify({wallet: currentWallet})
})

const basicData = await basicRes.json()

const proRes = await fetch("/api/analyse-pro",{
method:"POST",
headers:{
"Content-Type":"application/json"
},
body:JSON.stringify({wallet: currentWallet})
})

const proData = await proRes.json()

setData({
...basicData,
...proData
})

}catch(e){

console.log(e)
alert("Error analysing wallet")

}

setLoading(false)

}

return(

<main style={wrap}><div style={header}>
<div style={glow}/>
<div style={titleWrap}>
<div style={icon}>⚡</div>
<div>
<h1 style={title}>Base Wallet Analyser</h1>
<div style={subtitle}>
Analyse wallets on Base network
</div>
</div>
</div>
</div><div style={card}><div style={small}>Connected Wallet</div><div style={walletRow}><div style={walletText}>
{connecting
? "Connecting..."
: wallet || "No wallet"}
</div>{paid && <div style={pro}>PRO</div>}

{!wallet && !connecting && (
<button onClick={connectWallet} style={connect}>
Connect
</button>
)}

</div></div>{!paid && wallet && (

<div style={payCard}><div>
🔒 Pay 0.000025 ETH to unlock wallet analytics
</div><button onClick={pay} style={payBtn}>
Pay & Unlock
</button></div>)}

{paid && (
<button onClick={analyse} style={analyseBtn}>
{loading ? "Analysing..." : "Analyse Wallet"}
</button>
)}

<br/><br/>

{data && !data.error && (

<div style={result}><p>📊 Transactions: {data.totalTxns || 0}</p>
<p>💰 Transfer Volume: {data.totalVolumeETH || 0} ETH</p>
<p>⛽ Gas: {data.totalGasETH || 0} ETH</p>
<p>📅 Active Days: {data.activeDays || 0}</p><hr style={divider}/><p>🔁 Swaps: {data.swapCount || 0}</p>
<p>💎 Trading Volume: ${data.tradingVolumeUSD ?? 0}</p>
<p>📅 Trading Days: {data.tradingDays || 0}</p>
<p>⛽ Trading Gas: {data.tradingGasETH || 0} ETH</p><hr style={divider}/><p>🏆 Rank: #{data.rank || "-"}</p>
<p>⭐ Score: {data.score || 0}</p></div>)}

</main>
)}

/* styles */

const wrap:CSSProperties={padding:20,maxWidth:700,margin:"auto"}
const header:CSSProperties={background:"#020617",padding:24,borderRadius:18,marginBottom:25,position:"relative"}
const glow:CSSProperties={position:"absolute",width:200,height:200,background:"radial-gradient(circle,#22c55e33,transparent)",top:-60,right:-60}
const titleWrap:CSSProperties={display:"flex",alignItems:"center",gap:14}
const icon:CSSProperties={fontSize:34}
const title:CSSProperties={fontSize:28,fontWeight:700,margin:0}
const subtitle:CSSProperties={fontSize:13,opacity:.7}
const card:CSSProperties={background:"#020617",padding:14,borderRadius:10,border:"1px solid #111",marginBottom:10}
const small:CSSProperties={fontSize:12,opacity:.6}
const walletRow:CSSProperties={display:"flex",alignItems:"center",gap:8,marginTop:4}
const walletText:CSSProperties={wordBreak:"break-all"}
const pro:CSSProperties={background:"#22c55e",color:"#020617",padding:"2px 8px",borderRadius:6,fontSize:10,fontWeight:700}
const connect:CSSProperties={padding:"4px 10px",background:"#22c55e",border:"none",borderRadius:6}
const payCard:CSSProperties={background:"#111",padding:16,borderRadius:12,marginBottom:15,border:"1px solid #22c55e"}
const payBtn:CSSProperties={marginTop:10,padding:"8px 16px",background:"#22c55e",border:"none",borderRadius:8}
const analyseBtn:CSSProperties={padding:"12px 24px",borderRadius:10,background:"#22c55e",border:"none",fontWeight:600}
const result:CSSProperties={background:"#020617",color:"#00ff9c",padding:20,borderRadius:14}
const divider:CSSProperties={margin:"15px 0",borderColor:"#0f172a"}
