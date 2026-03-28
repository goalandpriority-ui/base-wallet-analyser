// app/layout.tsx
import Navbar from "./navbar"

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

<meta name="viewport" content="width=device-width, initial-scale=1" />

</head>

<body>

<Navbar />

{children}

</body>
</html>
)
}
