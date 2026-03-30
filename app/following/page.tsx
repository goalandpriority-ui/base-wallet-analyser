"use client"

import { useEffect,useState } from "react"
import Link from "next/link"

export default function Following(){

const [data,setData]=useState<any[]>([])

const load = ()=>{

const wallet = localStorage.getItem("lastWallet")
if(!wallet) return

fetch(`/api/follow?wallet=${wallet}`)
.then(res=>res.json())
.then(res=>{

/* remove duplicates */
const unique = Array.from(
new Map(
(res || []).map((w:any)=>[w.followed,w])
).values()
)

setData(unique)

})

}

useEffect(()=>{

load()

const i=setInterval(load,5000)
return ()=>clearInterval(i)

},[])

return(
<div style={{padding:20,maxWidth:900,margin:"auto",color:"#fff"}}>

<h1 style={{color:"#fff"}}>⭐ Following</h1>

{data.length===0 && (
<div style={{opacity:.6,fontSize:13}}>
No followed wallets
</div>
)}

{data.map((w,i)=>(

<div key={i} style={card}>

<div style={{wordBreak:"break-all"}}>
{w.followed}
</div>

<div style={{marginTop:8}}>
<Link href={`/wallet/${w.followed}`}>
<button style={viewBtn}>
View Wallet Profile
</button>
</Link>
</div>

</div>

))}

</div>
)
}

const card:React.CSSProperties={
background:"#020617",
padding:12,
borderRadius:10,
marginBottom:8,
border:"1px solid #111",
color:"#fff",
wordBreak:"break-all"
}

const viewBtn={
padding:"6px 12px",
background:"#22c55e",
border:"none",
borderRadius:8,
color:"#020617",
fontWeight:600,
cursor:"pointer"
}
