"use client"

import { useEffect, useState } from "react"
import Link from "next/link"

export default function Leaderboard() {

const [data,setData]=useState<any[]>([])
const [loading,setLoading]=useState(true)

useEffect(()=>{

fetch("/api/leaderboard")
.then(res=>res.json())
.then(d=>{
setData(d || [])
setLoading(false)
})

},[])

return (
<div style={{padding:20}}>

<Link href="/" style={{color:"#6b46c1"}}>
← Back to Home
</Link>

<h1 style={{
fontSize:32,
fontWeight:"bold",
margin:"10px 0 20px"
}}>
🏆 Leaderboard (24h)
</h1>

{loading && <p>Loading...</p>}

{!loading && data.length === 0 && (
<p>No wallets ranked yet</p>
)}

{data.map((w,i)=>(
<div
key={i}
style={{
background:"#000",
color:"#00ff9c",
padding:15,
borderRadius:10,
marginBottom:10
}}
>

<div style={{fontWeight:"bold"}}>
#{i+1}
</div>

<div>
{w.wallet}
</div>

<div>
Score: {w.score}
</div>

<div>
Swaps: {w.swapCount || 0}
</div>

<div>
Volume: ${w.tradingVolumeUSD || 0}
</div>

</div>
))}

</div>
)
}
