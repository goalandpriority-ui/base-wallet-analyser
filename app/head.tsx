export default function Head() {
  return (
    <>
      <title>Base Wallet Analyser</title>

      <meta name="description" content="Analyse wallets on Base network" />

      <meta property="og:title" content="Base Wallet Analyser" />
      <meta property="og:description" content="Analyse wallets on Base network" />
      <meta property="og:image" content="https://base-wallet-analyser.vercel.app/splash.png" />

      <meta
        name="fc:miniapp"
        content={JSON.stringify({
          version: "1",
          imageUrl: "https://base-wallet-analyser.vercel.app/splash.png",
          button: {
            title: "Open Base Wallet Analyser",
            action: {
              type: "launch_miniapp",
              url: "https://base-wallet-analyser.vercel.app",
              splashImageUrl: "https://base-wallet-analyser.vercel.app/splash.png",
              splashBackgroundColor: "#020617"
            }
          }
        })}
      />
    </>
  )
}
