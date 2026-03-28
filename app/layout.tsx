import Navbar from "./navbar"

const body = {
margin: 0,
minHeight: "100vh",
fontFamily: "system-ui",
background: "radial-gradient(circle at 20% 20%, #071225 0%, #020617 40%)",
color: "white"
}

const container = {
maxWidth: 900,
margin: "auto",
padding: 20
}

export default function RootLayout({
children,
}:{
children: React.ReactNode
}) {

const miniapp = {
version:"1",
imageUrl:"https://base-wallet-analyser.vercel.app/splash.png",
button:{
title:"Open Base Wallet Analyser",
action:{
type:"launch_miniapp",
url:"https://base-wallet-analyser.vercel.app",
splashImageUrl:"https://base-wallet-analyser.vercel.app/splash.png",
splashBackgroundColor:"#020617"
}
}
}

return (
<html lang="en">
<head>

<meta property="fc:miniapp" content={JSON.stringify(miniapp)} />

<meta property="og:title" content="Base Wallet Analyser" />
<meta property="og:description" content="Analyse wallets on Base network" />
<meta property="og:image" content="https://base-wallet-analyser.vercel.app/splash.png" />

</head>

<body style={body}>

<Navbar />

<div style={container}>
{children}
</div>

</body>
</html>
)
}
