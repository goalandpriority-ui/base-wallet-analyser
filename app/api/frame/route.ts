export async function GET() {
  return Response.json({
    version: "1",
    name: "Base Wallet Analyser",
    iconUrl: "https://base-wallet-analyser.vercel.app/icon.png",
    homeUrl: "https://base-wallet-analyser.vercel.app",
    imageUrl: "https://base-wallet-analyser.vercel.app/splash.png",
    buttonTitle: "Open Base Wallet Analyser",
    splashImageUrl: "https://base-wallet-analyser.vercel.app/splash.png",
    splashBackgroundColor: "#020617",
    webhookUrl: "https://base-wallet-analyser.vercel.app/api/webhook"
  })
}
