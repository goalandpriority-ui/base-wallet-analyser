"use client"

import { useEffect, useState } from "react"
import Link from "next/link"

export default function TopTraders() {

const [data,setData]=useState<any[]>([])
const [loading,setLoading]=useState(true)

useEffect(()=>{

fetch("/api/top-traders")
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

<h1 style={{fontSize:32,fontWeight:"bold",margin:"10px 0 20px"}}>
📈 Top Traders
</h1>

{loading && <p>Loading...</p>}

{data.map((w,i)=>(
<div key={i} style={{
background:"#000",
color:"#00ff9c",
padding:15,
borderRadius:10,
marginBottom:10
}}>
<div>#{i+1}</div>
<div>{w.wallet}</div>
<div>Volume: ${w.tradingVolumeUSD}</div>
<div>Swaps: {w.swapCount}</div>
</div>
))}

</div>
)
}
