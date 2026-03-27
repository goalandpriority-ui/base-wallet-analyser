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
checkPaid(w)
setConnecting(false)
return
}

}

}catch{}

/* CONTEXT FALLBACK */

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
checkPaid(w)
setConnecting(false)
return
}

}catch(e){
console.log("Farcaster wallet not found")
}

/* METAMASK FALLBACK */

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

/* CACHE FALLBACK */

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

try{

const provider = await sdk.wallet.getEthereumProvider()

if(provider){

const accounts = await provider.request({
method:"eth_requestAccounts"
})

if(accounts?.[0]){
const addr = accounts[0].toLowerCase()
setWallet(addr)
localStorage.setItem("lastWallet",addr)
checkPaid(addr)
return
}

}

}catch{}

const eth = (window as any).ethereum

if(!eth){
alert("No wallet found")
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

let provider:any

try{
provider = await sdk.wallet.getEthereumProvider()
}catch{}

if(!provider){
provider = (window as any).ethereum
}

await provider.request({
method:"wallet_switchEthereumChain",
params:[{ chainId:"0x2105" }]
}).catch(()=>{})

const tx = await provider.request({
method:"eth_sendTransaction",
params:[{
from:wallet,
to:process.env.NEXT_PUBLIC_PAY_TO!,
value:"0x16bcc41e9000"
}]
})

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
alert("No wallet found")
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

const finalData = {
...basicData,
...proData
}

setData(finalData)

/* AUTO CAST */
try{

const castText =
`🔥 Base Wallet analysed!

📊 Transactions: ${finalData.totalTxns}
💰 Transfer Volume: ${finalData.totalVolumeETH} ETH
🔁 Swaps: ${finalData.swapCount}
💎 Trading Volume: $${finalData.tradingVolumeUSD}

🏆 Rank: #${finalData.rank}
⭐ Score: ${finalData.score}

Analyse yours 👇
https://base-wallet-analyser.vercel.app`

await sdk.actions.composeCast({
text: castText
})

}catch{}

}catch(e){

console.log(e)

}

setLoading(false)

}

return (

<div style={container}><h2>Base Wallet Analyser</h2>{connecting && <p>Connecting wallet...</p>}

{!wallet && !connecting && (
<button style={button} onClick={connectWallet}>
Connect Wallet
</button>
)}

{wallet && !paid && (
<button style={button} onClick={pay}>
Pay 0.000025 ETH
</button>
)}

{wallet && paid && (
<button style={button} onClick={analyse}>
Analyse Wallet
</button>
)}

{loading && <p>Analysing...</p>}

{data && !data.error && (

<div style={result}><p>📊 Transactions: {data.totalTxns}</p>
<p>💰 Transfer Volume: {data.totalVolumeETH} ETH</p>
<p>⛽ Gas: {data.totalGasETH} ETH</p>
<p>📅 Active Days: {data.activeDays}</p><hr style={divider}/><p>🔁 Swaps: {data.swapCount}</p>
<p>💎 Trading Volume: ${data.tradingVolumeUSD}</p>
<p>📅 Trading Days: {data.tradingDays}</p>
<p>⛽ Trading Gas: {data.tradingGasETH} ETH</p><hr style={divider}/><p>🏆 Rank: #{data.rank}</p>
<p>⭐ Score: {data.score}</p></div>)}

</div>
)}

const container:CSSProperties={
padding:20
}

const button:CSSProperties={
padding:12,
marginTop:10,
cursor:"pointer"
}

const result:CSSProperties={
marginTop:20,
background:"#020617",
color:"#22c55e",
padding:20,
borderRadius:12,
border:"1px solid #111"
}

const divider:CSSProperties={
margin:"15px 0",
borderColor:"#111"
}
