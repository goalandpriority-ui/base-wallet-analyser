"use client"

import { useEffect,useState } from "react"
import Link from "next/link"

export default function Following(){

const [data,setData]=useState<any[]>([])

useEffect(()=>{

const wallet = localStorage.getItem("lastWallet")

fetch(`/api/follow?wallet=${wallet}`)
.then(res=>res.json())
.then(setData)

},[])

return(
<div style={{padding:20}}>

<h1>⭐ Following</h1>

{data.map((w,i)=>(
<Link
key={i}
href={`/wallet/${w.followed}`}
>
<div style={{
background:"#020617",
padding:12,
borderRadius:10,
marginBottom:8,
border:"1px solid #111"
}}>
{w.followed}
</div>
</Link>
))}

</div>
)
}
