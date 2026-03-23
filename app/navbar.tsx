"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

export default function Navbar(){

const pathname = usePathname()

return(
<div style={wrap}>

<div style={nav}>

<NavLink href="/" active={pathname==="/"}>🏠 Home</NavLink>

<NavLink href="/leaderboard" active={pathname==="/leaderboard"}>
🏆 Leaderboard
</NavLink>

<NavLink href="/top-wallets" active={pathname==="/top-wallets"}>
👑 Wallets
</NavLink>

<NavLink href="/top-traders" active={pathname==="/top-traders"}>
📈 Traders
</NavLink>

<NavLink href="/highest-volume" active={pathname==="/highest-volume"}>
💰 Volume
</NavLink>

{/* NEW COPY TRADING */}
<NavLink href="/copy-trading" active={pathname==="/copy-trading"}>
📋 Copy Trading
</NavLink>

<NavLink href="/creator" active={pathname==="/creator"}>
👤 Creator
</NavLink>

</div>

</div>
)
}

function NavLink({href,active,children}:any){
return(
<Link
href={href}
style={{
...link,
...(active?activeLink:{})
}}
>
{children}
</Link>
)
}

const wrap = {
position:"sticky" as const,
top:0,
zIndex:100,
backdropFilter:"blur(14px)",
background:"rgba(2,6,23,0.6)",
borderBottom:"1px solid #0f172a"
}

const nav = {
display:"flex",
gap:12,
padding:14,
overflowX:"auto" as const
}

const link = {
color:"#22c55e",
textDecoration:"none",
padding:"8px 14px",
borderRadius:10,
whiteSpace:"nowrap" as const,
background:"rgba(15,23,42,0.5)",
border:"1px solid #0f172a"
}

const activeLink = {
background:"linear-gradient(90deg,#22c55e,#4ade80)",
color:"#020617",
fontWeight:700,
boxShadow:"0 0 20px rgba(34,197,94,0.6)"
}
