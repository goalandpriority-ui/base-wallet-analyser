"use client"

import { useEffect, useState } from "react"
import Link from "next/link"

export default function TopTraders(){

const [data,setData]=useState<any[]>([])
const [page,setPage]=useState(1)
const [rank,setRank]=useState<number|null>(null)

const wallet =
typeof window !== "undefined"
? localStorage.getItem("lastWallet")
: null

useEffect(()=>{

fetch(`/api/top-traders?page=${page}&wallet=${wallet||""}`)
.then(res=>res.json())
.then(res=>{
setData(res.data || [])
setRank(res.yourRank)
})

},[page])

return(
<div className="p-6">

<Link href="/">← Back to Home</Link>

<h1 className="text-3xl font-bold mt-2 mb-4">
📈 Top Traders
</h1>

{rank && (
<div className="bg-black text-green-400 p-3 rounded mb-4">
Your Rank: #{rank}
</div>
)}

<div className="space-y-2">
{data.map((w,i)=>(
<div key={i}
className="bg-black text-green-400 p-3 rounded"
>
#{(page-1)*1000+i+1} — {w.wallet}
 — swaps: {w.swaps}
</div>
))}
</div>

<div className="flex gap-4 mt-6">

<button onClick={()=>setPage(p=>Math.max(1,p-1))}>
Prev
</button>

<span>Page {page}</span>

<button onClick={()=>setPage(p=>p+1)}>
Next
</button>

</div>

</div>
)
}
