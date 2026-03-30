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

</div>
)
}

const card={
background:"#020617",
padding:12,
borderRadius:10,
marginBottom:8,
border:"1px solid #111",
color:"#fff",
wordBreak:"break-all"
}
