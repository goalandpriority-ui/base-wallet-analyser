"use client"

import { useEffect, useState } from "react"
import Link from "next/link"

export default function CreatorProfile(){

const address =
"0xffF8b3F8D8b1F06EDE51fc331022B045495cEEA2"

const [donations,setDonations]=useState<any[]>([])

const copy = async () =>{
await navigator.clipboard.writeText(address)
alert("Address copied")
}

const sendTip = () =>{
window.open(
`https://app.uniswap.org/#/send?chain=base&recipient=${address}`,
"_blank"
)
}

// mock donations (later real onchain)
useEffect(()=>{

setDonations([
{wallet:"0x8ab...21",amount:0.02},
{wallet:"0x771...aa",amount:0.01},
{wallet:"0x921...ff",amount:0.005}
])

},[])

return(
<div style={{
minHeight:"100vh",
background:"#071225",
color:"white",
padding:20,
fontFamily:"system-ui"
}}>

<Link href="/" style={{
color:"#22c55e",
display:"inline-block",
marginBottom:20
}}>
← Back to Home
</Link>

<h1 style={{
fontSize:34,
fontWeight:700,
background:"linear-gradient(90deg,#60a5fa,#34d399)",
WebkitBackgroundClip:"text",
WebkitTextFillColor:"transparent",
marginBottom:5
}}>
👤 Creator Profile
</h1>

<div style={{
color:"#22c55e",
fontSize:14,
marginBottom:20
}}>
✔ Verified Builder on Base
</div>

<p style={{
opacity:0.8,
marginBottom:25
}}>
Connect with me across platforms 🚀
</p>

{/* links */}
<div style={card}>

<a
href="https://farcaster.xyz/iamalien"
target="_blank"
style={btnPurple}
>
🟣 Farcaster Profile
</a>

<a
href="https://base.app/profile/iamalien"
target="_blank"
style={btnBlue}
>
🔵 Base App Profile
</a>

<a
href="https://x.com/iamalien000"
target="_blank"
style={btnDark}
>
🐦 X (Twitter)
</a>

</div>

{/* about */}
<div style={card}>
<div>🚀 Building on Base</div>
<div>🔥 Boosting Social Posts</div>
<div>⚡ Web3 Growth Tools</div>
</div>

{/* support */}
<div style={card}>

<h3 style={{marginBottom:10}}>
💰 Support My Work
</h3>

<p style={{opacity:0.7}}>
Send a tip on Base 🚀
</p>

<div style={{
marginTop:10,
wordBreak:"break-all",
fontSize:14
}}>
{address}
</div>

<button onClick={copy} style={copyBtn}>
Copy Address
</button>

<button onClick={sendTip} style={tipBtn}>
⚡ Send Tip
</button>

</div>

{/* donations list */}
<div style={card}>

<h3 style={{marginBottom:10}}>
🧾 Recent Donations
</h3>

{donations.length===0 && (
<div style={{opacity:0.6}}>
No donations yet
</div>
)}

{donations.map((d,i)=>(
<div key={i} style={{
display:"flex",
justifyContent:"space-between",
padding:"8px 0",
borderBottom:"1px solid #13213d"
}}>

<div>{d.wallet}</div>

<div>
💰 {d.amount} ETH
</div>

</div>
))}

</div>

</div>
)
}

const card = {
background:"#0b1a33",
padding:20,
borderRadius:16,
marginBottom:20
}

const btnPurple = {
display:"block",
padding:14,
borderRadius:12,
marginBottom:10,
background:"linear-gradient(90deg,#9333ea,#6366f1)",
textDecoration:"none",
color:"white",
textAlign:"center"
}

const btnBlue = {
display:"block",
padding:14,
borderRadius:12,
marginBottom:10,
background:"linear-gradient(90deg,#3b82f6,#22c55e)",
textDecoration:"none",
color:"white",
textAlign:"center"
}

const btnDark = {
display:"block",
padding:14,
borderRadius:12,
background:"#1f2937",
textDecoration:"none",
color:"white",
textAlign:"center"
}

const copyBtn = {
marginTop:10,
padding:"8px 14px",
borderRadius:8,
background:"#1f2937",
color:"white",
border:"none",
cursor:"pointer"
}

const tipBtn = {
marginTop:12,
width:"100%",
padding:14,
borderRadius:12,
background:"linear-gradient(90deg,#22c55e,#4ade80)",
border:"none",
fontWeight:600,
cursor:"pointer"
}
