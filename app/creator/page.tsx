"use client"

import Link from "next/link"

export default function CreatorProfile(){

return(
<div style={{
minHeight:"100vh",
background:"#071225",
color:"white",
padding:20,
fontFamily:"system-ui"
}}>

{/* back */}
<Link href="/" style={{
color:"#22c55e",
display:"inline-block",
marginBottom:20
}}>
← Back to Home
</Link>

{/* title */}
<h1 style={{
fontSize:34,
fontWeight:700,
background:"linear-gradient(90deg,#60a5fa,#34d399)",
WebkitBackgroundClip:"text",
WebkitTextFillColor:"transparent",
marginBottom:10
}}>
👤 Creator Profile
</h1>

<p style={{
opacity:0.8,
marginBottom:25
}}>
Connect with me across platforms 🚀
</p>

{/* links card */}
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
0xffF8b3F8D8b1F06EDE51fc331022B045495cEEA2
</div>

<button style={copyBtn}>
Copy Address
</button>

<button style={tipBtn}>
⚡ Send Tip
</button>

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
