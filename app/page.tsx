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

/* farcaster provider connect */
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
