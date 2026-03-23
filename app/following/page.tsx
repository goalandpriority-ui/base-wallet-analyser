"use client"

import { useEffect,useState } from "react"
import Link from "next/link"

export default function Following(){

const [data,setData]=useState<any[]>([])
const [activity,setActivity]=useState<any[]>([])

const load = ()=>{

const wallet = localStorage.getItem("lastWallet")
if(!wallet) return

/* followed wallets */
fetch(`/api/follow?wallet=${wallet}`)
.then(res=>res.json())
.then(setData)

/* live activity */
fetch(`/api/following-activity?wallet=${wallet}`)
.then(res=>res.json())
.then(res=>{

/* FIX FIELD NAMES */
const mapped = (res || []).map((w:any)=>({
...w,
swaps: w.swapCount || w.swaps || 0,
volume: w.tradingVolumeUSD || w.volume || 0
}))

setActivity(mapped)

})

}

useEffect(()=>{

load()

const i=setInterval(load,5000)
return ()=>clearInterval(i)

},[])

const copy = (wallet:string)=>{
navigator.clipboard.writeText(wallet)
}

return(
<div style={{padding:20,maxWidth:900,margin:"auto"}}>

<h1>⭐ Following</h1>

{/* followed wallets */}
{data.map((w,i)=>(
<Link
key={i}
href={`/wallet/${w.followed}`}
style={{textDecoration:"none"}}
>
<div style={card}>
{w.followed}
</div>
</Link>
))}

{/* live activity */}
{activity.length>0 && (
<div style={{marginTop:20}}>

<h2>🔥 Live Activity</h2>

{activity.map((w,i)=>(

<Link
key={i}
href={`/wallet/${w.wallet}`}
style={{textDecoration:"none"}}
>
<div style={card}>

<div style={{fontWeight:600}}>
{w.wallet}
</div>

<div style={sub}>
Swaps: {w.swaps}
</div>

<div style={sub}>
Volume: ${Math.round(w.volume)}
</div>

<div style={tag}>
⚡ Active trader
</div>

</div>
</Link>

))}

</div>
)}

{/* copy trade feed */}
{activity.length>0 && (
<div style={{marginTop:20}}>

<h2>🤖 Copy Trade Feed</h2>

{activity.slice(0,5).map((w,i)=>(

<div key={i} style={card}>

<div style={{fontWeight:600}}>
{w.wallet}
</div>

<div style={sub}>
Best token trader
</div>

<button
onClick={()=>copy(w.wallet)}
style={copyBtn}
>
Copy trades
</button>

</div>

))}

</div>
)}

</div>
)
}

const card={
background:"#020617",
padding:12,
borderRadius:10,
marginBottom:8,
border:"1px solid #111"
}

const sub={
fontSize:12,
opacity:0.7
}

const tag={
marginTop:4,
fontSize:11,
color:"#22c55e"
}

const copyBtn={
marginTop:6,
padding:"5px 10px",
borderRadius:6,
background:"#a855f7",
border:"none",
color:"#fff",
cursor:"pointer"
}
