"use client"

import { useEffect, useState, CSSProperties } from "react"
import { sdk } from "@farcaster/miniapp-sdk"

/* FORCE FARCASTER BG FIX */
if (typeof window !== "undefined") {
document.documentElement.style.background = "#020617"
document.body.style.background = "#020617"
document.body.style.color = "#22c55e"
}

export default function Home() {

const [wallet,setWallet]=useState("")
const [data,setData]=useState<any>(null)
const [loading,setLoading]=useState(false)
const [paid,setPaid]=useState(false)
const [connecting,setConnecting]=useState(true)

/* SAFE PAID CHECK */
const isPaid =
paid ||
(localStorage.getItem("paid_"+wallet) === "true")

/* MINIAPP READY */
useEffect(()=>{
sdk.actions.ready()
},[])

/* RESTORE PAID FROM LOCAL */
useEffect(()=>{

const cached = localStorage.getItem("lastWallet")
if(!cached) return

const localPaid = localStorage.getItem("paid_"+cached)

if(localPaid==="true"){
setPaid(true)
}

},[])

/* AUTO CHECK AFTER WALLET */
useEffect(()=>{
if(wallet){
checkPaid(wallet)
}
},[wallet])

/* CONNECT */
useEffect(()=>{

const init = async()=>{

try{

/* FARCASTER PROVIDER FIRST */
try{

const provider = await sdk.wallet.getEthereumProvider()

if(provider){

const accounts = await provider.request({
method:"eth_accounts"
})

if(accounts?.[0]){
const w = accounts[0].toLowerCase()
setWallet(w)
localStorage.setItem("lastWallet",w)

const localPaid = localStorage.getItem("paid_"+w)
if(localPaid==="true") setPaid(true)

checkPaid(w)
setConnecting(false)
return
}

}

}catch{}

let context:any = await sdk.context

let fcWallet =
context?.user?.wallet?.address

const fcWalletOld =
context?.user?.verifiedAddresses?.ethAddresses?.[0]

fcWallet = fcWallet || fcWalletOld

if(!fcWallet){

await new Promise(r=>setTimeout(r,300))

context = await sdk.context

fcWallet =
context?.user?.wallet?.address ||
context?.user?.verifiedAddresses?.ethAddresses?.[0]

}

if(fcWallet){
const w = fcWallet.toLowerCase()
setWallet(w)
localStorage.setItem("lastWallet",w)

const localPaid = localStorage.getItem("paid_"+w)
if(localPaid==="true") setPaid(true)

checkPaid(w)
setConnecting(false)
return
}

}catch(e){}

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

const localPaid = localStorage.getItem("paid_"+w)
if(localPaid==="true") setPaid(true)

checkPaid(w)
setConnecting(false)
return
}

}

}catch{}

const cached = localStorage.getItem("lastWallet")

if(cached){

const w = cached.toLowerCase()

setWallet(w)

const localPaid = localStorage.getItem("paid_"+w)
if(localPaid==="true") setPaid(true)

checkPaid(w)
}

setConnecting(false)

}

init()

},[])

/* CHECK PAID */
const checkPaid = async (addr?:string)=>{

const w = (addr || wallet)?.toLowerCase()
if(!w) return

/* instant unlock */
const localPaid = localStorage.getItem("paid_"+w)
if(localPaid==="true"){
setPaid(true)
}

try{

const res = await fetch(`/api/check-paid?wallet=${w}`)
const json = await res.json()

setPaid(json.paid)

if(json.paid){
localStorage.setItem("paid_"+w,"true")
}

}catch{}

}

/* ANALYSE */
const analyse = async()=>{

/* PAYMENT USING CONNECTED WALLET */
if(!isPaid){

try{

let eth = (window as any).ethereum

if(!eth){
const provider = await sdk.wallet.getEthereumProvider()
eth = provider
}

const tx = await eth.request({
method:"eth_sendTransaction",
params:[{
from: wallet,
to: "0xffF8b3F8D8b1F06EDE51fc331022B045495cEEA2",
value:"0x16bcc41e9000"
}]
})

if(tx){
setPaid(true)
localStorage.setItem("paid_"+wallet,"true")
}

}catch(e){
console.log("payment failed",e)
}

return
}

setLoading(true)
setData(null)

try{

let currentWallet =
(localStorage.getItem("lastWallet") || wallet)?.toLowerCase()

const basicRes = await fetch("/api/analyse",{
method:"POST",
headers:{ "Content-Type":"application/json" },
body:JSON.stringify({wallet: currentWallet})
})

const basicData = await basicRes.json()

const proRes = await fetch("/api/analyse-pro",{
method:"POST",
headers:{ "Content-Type":"application/json" },
body:JSON.stringify({wallet: currentWallet})
})

const proData = await proRes.json()

const finalData = { ...basicData, ...proData }

setData(finalData)

/* AUTO CAST */
try{

await sdk.actions.composeCast({
text:`Base Wallet Report

Wallet: ${wallet}

📊 Transactions: ${finalData.totalTxns}
💰 Transfer Volume: ${finalData.totalVolumeETH} ETH
🔁 Swaps: ${finalData.swapCount}
💎 Trading Volume: $${finalData.tradingVolumeUSD}

🏆 Rank: #${finalData.rank}
⭐ Score: ${finalData.score}

Analyze your wallet 👇`,
embeds:[
"https://base-wallet-analyser.vercel.app/"
]
})

}catch{}

}catch(e){
console.log(e)
}

setLoading(false)

}

/* UI */

return(

<main style={wrap}>

<div style={header}>
<div style={titleWrap}>
<div style={icon}>⚡</div>
<div>
<h1 style={title}>Base Wallet Analyser</h1>
<div style={subtitle}>Analyse wallets on Base network</div>
</div>
</div>
</div>

<div style={card}>
<div style={small}>Connected Wallet</div>

<div style={walletRow}>
<div style={walletText}>
{connecting ? "Connecting..." : wallet}
</div>

{isPaid && <div style={pro}>PRO</div>}
</div>
</div>

<button
onClick={analyse}
style={{
...analyseBtn,
opacity:1,
cursor:"pointer"
}}
>
{loading
? "Analysing..."
: isPaid
? "Analyse Wallet"
: "🔒 Pay 0.000025 ETH to unlock wallet stats"}
</button>

{data && (

<div style={result}>

<p>📊 Transactions: {data.totalTxns}</p>
<p>💰 Transfer Volume: {data.totalVolumeETH} ETH</p>
<p>⛽ Gas: {data.totalGasETH} ETH</p>
<p>📅 Active Days: {data.activeDays}</p>

<hr style={divider}/>

<p>🔁 Swaps: {data.swapCount}</p>
<p>💎 Trading Volume: ${data.tradingVolumeUSD}</p>
<p>📅 Trading Days: {data.tradingDays}</p>
<p>⛽ Trading Gas: {data.tradingGasETH} ETH</p>

<hr style={divider}/>

<p>🏆 Rank: #{data.rank}</p>
<p>⭐ Score: {data.score}</p>

</div>

)}

</main>

)

}

/* styles */

const wrap:CSSProperties={padding:20,maxWidth:700,margin:"auto"}

const header:CSSProperties={
background:"#020617",
padding:24,
borderRadius:18,
marginBottom:25
}

const titleWrap:CSSProperties={
display:"flex",
alignItems:"center",
gap:14
}

const icon:CSSProperties={fontSize:34}

const title:CSSProperties={
fontSize:28,
fontWeight:700,
margin:0,
color:"#22c55e"
}

const subtitle:CSSProperties={
fontSize:13,
opacity:.7,
color:"#22c55e"
}

const card:CSSProperties={
background:"#020617",
padding:14,
borderRadius:10,
border:"1px solid #111",
marginBottom:10
}

const small:CSSProperties={fontSize:12,opacity:.6}

const walletRow:CSSProperties={
display:"flex",
alignItems:"center",
gap:8,
marginTop:4
}

const walletText:CSSProperties={wordBreak:"break-all"}

const pro:CSSProperties={
background:"#22c55e",
color:"#020617",
padding:"2px 8px",
borderRadius:6,
fontSize:10,
fontWeight:700
}

const analyseBtn:CSSProperties={
padding:"12px 24px",
borderRadius:10,
background:"#22c55e",
border:"none",
fontWeight:600,
marginTop:10
}

const result:CSSProperties={
background:"#020617",
color:"#22c55e",
padding:20,
borderRadius:14,
marginTop:20
}

const divider:CSSProperties={
margin:"15px 0",
borderColor:"#0f172a"
  }
