import { ImageResponse } from "next/og"

export const runtime = "edge"

export const size = {
width: 1200,
height: 630
}

export const contentType = "image/png"

export default async function Image({ params }: any) {

const address = params.address

let data:any = {}

try{
const res = await fetch(
`https://base-wallet-analyser.vercel.app/api/analyse-pro`,
{
method:"POST",
headers:{ "Content-Type":"application/json" },
body: JSON.stringify({ wallet: address })
}
)

data = await res.json()
}catch{}

return new ImageResponse(
(
<div
style={{
background:"#020617",
width:"100%",
height:"100%",
display:"flex",
flexDirection:"column",
justifyContent:"space-between",
padding:60,
color:"#22c55e",
fontFamily:"sans-serif"
}}
>

<div>

<div style={{
fontSize:42,
fontWeight:700
}}>
Base Wallet Analyser
</div>

<div style={{
marginTop:20,
fontSize:22
}}>
{address}
</div>

<div style={{marginTop:30,fontSize:20}}>
🏆 Rank: #{data?.rank || "-"}
</div>

<div style={{fontSize:20}}>
⭐ Score: {Math.round(data?.score || 0)}
</div>

<div style={{fontSize:20}}>
🔁 Swaps: {data?.swapCount || 0}
</div>

<div style={{fontSize:20}}>
💰 Volume: ${Math.round(data?.tradingVolumeUSD || 0)}
</div>

</div>

<div style={{
display:"flex",
justifyContent:"space-between",
alignItems:"center"
}}>

<div style={{
fontSize:18,
opacity:.8
}}>
base-wallet-analyser.vercel.app
</div>

<div style={{
background:"#22c55e",
color:"#020617",
padding:"10px 20px",
borderRadius:10,
fontSize:18,
fontWeight:700
}}>
Open App →
</div>

</div>

</div>
),
{ ...size }
)
}
