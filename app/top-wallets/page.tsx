"use client"

import { useEffect, useState } from "react"

export default function TopWallets() {

const [data,setData]=useState<any[]>([])

useEffect(()=>{

fetch("/api/top-wallets")
.then(res=>res.json())
.then(setData)

},[])

return (
<div className="p-6">

<h1 className="text-2xl font-bold mb-4">
👑 Top Wallets
</h1>

<div className="space-y-2">

{data.map((w,i)=>(
<div
key={i}
className="bg-black text-green-400 p-3 rounded"
>

<div>#{i+1}</div>
<div>{w.wallet}</div>
<div>Score: {w.score}</div>

</div>
))}

</div>
</div>
)
}
