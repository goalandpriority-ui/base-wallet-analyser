import Home from "./home"

export const metadata = {
  title: "Base Wallet Analyser",
  description: "Analyse wallets on Base network",
  other: {
    "fc:miniapp": JSON.stringify({
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
    })
  }
}

export default function Page(){
  return <Home/>
}
