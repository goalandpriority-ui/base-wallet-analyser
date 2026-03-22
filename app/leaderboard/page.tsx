"use client"

import Link from "next/link"
import { useEffect, useState } from "react"

export default function Leaderboard() {

const [data,setData]=useState<any[]>([])

useEffect(()=>{

fetch("/api/leaderboard")
.then(res=>res.json())
.then(setData)

},[])

return (
<div className="p-6">

<Link href="/" className="text-blue-500">
← Back to Home
</Link>

<h1 className="text-3xl font-bold mt-2 mb-6">
🏆 Leaderboard (24h)
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
