"use client"

import Link from "next/link"

export default function Back(){
return(
<Link href="/" style={backBtn}>
← Back to Home
</Link>
)
}

const backBtn = {
color:"#22c55e",
textDecoration:"none",
fontWeight:600,
display:"inline-block",
marginBottom:20,
padding:"6px 10px",
borderRadius:8,
background:"rgba(34,197,94,0.08)",
border:"1px solid rgba(34,197,94,0.25)"
}
