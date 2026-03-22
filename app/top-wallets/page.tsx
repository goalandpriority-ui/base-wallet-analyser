"use client"

import Link from "next/link"
import { useEffect, useState } from "react"

export default function Page(){

const [data,setData]=useState<any[]>([])

useEffect(()=>{
fetch("/api/top-wallets")
.then(res=>res.json())
.then(setData)
},[])

return(
<div className="p-6">

<Link href="/" className="text-blue-500">
← Back to Home
</Link>

<h1 className="text-3xl font-bold mt-2 mb-6">
👑 Top Wallets
</h1>

{data.map((w,i)=>(
<div key={i} className="bg-black text-green-400 p-3 mb-2 rounded">
#{i+1} — {w.wallet}
</div>
))}

</div>
)
}
