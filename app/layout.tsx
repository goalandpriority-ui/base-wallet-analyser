import Navbar from "./navbar"

export const metadata = {
  title: "Base Wallet Analyser",
  description: "Analyse Base wallets",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const miniAppEmbed = {
    version: "next",
    imageUrl: "https://base-wallet-analyser.vercel.app/splash.png",
    button: {
      title: "Open Base Wallet Analyser",
      action: {
        type: "launch_frame",
        name: "Base Wallet Analyser",
        url: "https://base-wallet-analyser.vercel.app/",
        splashImageUrl: "https://base-wallet-analyser.vercel.app/splash.png",
        splashBackgroundColor: "#020617"
      }
    }
  };

  return (
    <html lang="en">
      <head>
        {/* === MAIN Farcaster Mini App Embed (This is the most important one) === */}
        <meta 
          name="fc:miniapp" 
          content={JSON.stringify(miniAppEmbed)} 
        />

        {/* Backward compatibility */}
        <meta property="fc:frame" content="vNext" />
        <meta
          property="fc:frame:image"
          content="https://base-wallet-analyser.vercel.app/splash.png"
        />
        <meta
          property="fc:frame:button:1"
          content="Open Base Wallet Analyser"
        />
        <meta
          property="fc:frame:button:1:action"
          content="link"
        />
        <meta
          property="fc:frame:button:1:target"
          content="https://base-wallet-analyser.vercel.app"
        />

        {/* Open Graph */}
        <meta property="og:title" content="Base Wallet Analyser" />
        <meta property="og:description" content="Analyse wallets on Base network - Transactions, Volume & On-chain Activity" />
        <meta
          property="og:image"
          content="https://base-wallet-analyser.vercel.app/splash.png"
        />
      </head>

      <body style={body}>
        <div style={glow1} />
        <div style={glow2} />
        <div style={glow3} />

        <Navbar />

        <div style={container}>
          {children}
        </div>
      </body>
    </html>
  )
}

// Styles same as before (copy your existing styles)
const body = {
  margin:0,
  minHeight:"100vh",
  fontFamily:"system-ui",
  background: "radial-gradient(circle at 20% 20%, #071225 0%, #020617 40%)",
  color:"white"
}

const container = {
  maxWidth:900,
  margin:"auto",
  padding:20
}

const glow1 = { position:"fixed" as const, top:-200, left:-200, width:400, height:400, background:"radial-gradient(#22c55e33, transparent)", filter:"blur(80px)", zIndex:-1 }
const glow2 = { position:"fixed" as const, bottom:-200, right:-200, width:400, height:400, background:"radial-gradient(#3b82f633, transparent)", filter:"blur(80px)", zIndex:-1 }
const glow3 = { position:"fixed" as const, top:"40%", left:"50%", width:300, height:300, background:"radial-gradient(#22c55e22, transparent)", filter:"blur(60px)", zIndex:-1 }
