export default function Head() {

const miniAppConfig = {
  version: "1",
  imageUrl: "https://base-wallet-analyser.vercel.app/splash.png",
  button: {
    title: "Open Base Wallet Analyser",
    action: {
      type: "launch_miniapp",
      url: "https://base-wallet-analyser.vercel.app/",
      splashImageUrl: "https://base-wallet-analyser.vercel.app/splash.png",
      splashBackgroundColor: "#020617"
    }
  }
}

return (
<>
<meta name="fc:miniapp" content={JSON.stringify(miniAppConfig)} />

<meta property="fc:frame" content="vNext" />
<meta property="fc:frame:image" content="https://base-wallet-analyser.vercel.app/splash.png" />
<meta property="fc:frame:button:1" content="Open Base Wallet Analyser" />
<meta property="fc:frame:button:1:action" content="link" />
<meta property="fc:frame:button:1:target" content="https://base-wallet-analyser.vercel.app" />

<meta property="og:title" content="Base Wallet Analyser" />
<meta property="og:description" content="Analyse wallets on Base network" />
<meta property="og:image" content="https://base-wallet-analyser.vercel.app/splash.png" />
</>
)
}
