"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

export const metadata = {
  title: "Base Wallet Analyser",
  description: "Analyse Base wallets",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body style={body}>

        {/* floating glow background */}
        <div style={glow1} />
        <div style={glow2} />
        <div style={glow3} />

        {/* NAVBAR */}
        <Navbar />

        {/* CONTENT */}
        <div style={container}>
          {children}
        </div>

      </body>
    </html>
  )
}

function Navbar(){

const pathname = usePathname()

return(
<div style={navWrap}>

<div style={nav}>

<NavLink href="/" active={pathname==="/"}>🏠 Home</NavLink>
<NavLink href="/leaderboard" active={pathname==="/leaderboard"}>🏆 Leaderboard</NavLink>
<NavLink href="/top-wallets" active={pathname==="/top-wallets"}>👑 Wallets</NavLink>
<NavLink href="/top-traders" active={pathname==="/top-traders"}>📈 Traders</NavLink>
<NavLink href="/highest-volume" active={pathname==="/highest-volume"}>💰 Volume</NavLink>
<NavLink href="/creator" active={pathname==="/creator"}>👤 Creator</NavLink>

</div>

</div>
)
}

function NavLink({
href,
active,
children
}:{
href:string
active:boolean
children:React.ReactNode
}){

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

/* styles */

const body = {
margin:0,
minHeight:"100vh",
fontFamily:"system-ui",
background:
"radial-gradient(circle at 20% 20%, #071225 0%, #020617 40%)",
color:"white"
}

const container = {
maxWidth:900,
margin:"auto",
padding:20
}

const navWrap = {
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
border:"1px solid #0f172a",
transition:"0.2s",
boxShadow:"0 0 0 rgba(34,197,94,0)"
}

const activeLink = {
background:"linear-gradient(90deg,#22c55e,#4ade80)",
color:"#020617",
fontWeight:700,
boxShadow:"0 0 20px rgba(34,197,94,0.6)"
}

/* floating glow */

const glow1 = {
position:"fixed" as const,
top:-200,
left:-200,
width:400,
height:400,
background:"radial-gradient(#22c55e33, transparent)",
filter:"blur(80px)",
zIndex:-1
}

const glow2 = {
position:"fixed" as const,
bottom:-200,
right:-200,
width:400,
height:400,
background:"radial-gradient(#3b82f633, transparent)",
filter:"blur(80px)",
zIndex:-1
}

const glow3 = {
position:"fixed" as const,
top:"40%",
left:"50%",
width:300,
height:300,
background:"radial-gradient(#22c55e22, transparent)",
filter:"blur(60px)",
zIndex:-1
  }
