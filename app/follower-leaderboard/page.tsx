"use client"

import { useEffect,useState } from "react"
import Link from "next/link"

export default function FollowerLeaderboard(){

const [data,setData]=useState<any[]>([])

useEffect(()=>{

fetch("/api/follower-leaderboard")
.then(res=>res.json())
.then(res=>{

/* FIX FIELD NAMES */
const mapped = (res || []).map((w:any)=>({
...w,
followers:
w.followers ??
w.followers_count ??
w.count ??
0
}))

setData(mapped)

})

},[])

return(
<div style={{padding:20,maxWidth:900,margin:"auto",color:"#fff"}}>

<h1 style={{
fontSize:30,
fontWeight:700,
marginBottom:20,
color:"#fff"
}}>
👥 Most Followed Wallets
</h1>

{data.map((w,i)=>(

<Link
key={i}
href={`/wallet/${w.wallet}`}
style={{textDecoration:"none"}}
>

<div style={{
background:"#020617",
padding:14,
borderRadius:12,
marginBottom:10,
border:w.paid
? "1px solid #22c55e"
: "1px solid #111",
boxShadow:w.paid
? "0 0 12px rgba(34,197,94,.4)"
: "none",
color:"#fff"
}}>

<div style={{
display:"flex",
justifyContent:"space-between"
}}>

<div>
#{i+1}

{w.paid && (
<span style={badge}>
PRO
</span>
)}

</div>

<div>
⭐ {w.followers}
</div>

</div>

<div style={{
fontSize:12,
opacity:.9,
marginTop:4,
wordBreak:"break-all",
color:"#fff"
}}>
{w.wallet}
</div>

</div>

</Link>

))}

</div>
)
}

const badge={
marginLeft:8,
background:"#22c55e",
color:"#020617",
padding:"2px 6px",
borderRadius:4,
fontSize:9,
fontWeight:700
}
