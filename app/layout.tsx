import Link from "next/link"

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
      <body>

        <div style={{padding:20}}>

          <div style={{
            background:"#000",
            padding:12,
            borderRadius:10,
            marginBottom:20
          }}>

            <Link href="/" style={{color:"#00ff9c",marginRight:15}}>
              🏠 Home
            </Link>

            <Link href="/leaderboard" style={{color:"#00ff9c",marginRight:15}}>
              🏆 Leaderboard
            </Link>

            <Link href="/top-wallets" style={{color:"#00ff9c",marginRight:15}}>
              👑 Top Wallets
            </Link>

            <Link href="/top-traders" style={{color:"#00ff9c",marginRight:15}}>
              📈 Top Traders
            </Link>

            <Link href="/highest-volume" style={{color:"#00ff9c"}}>
              💰 Highest Volume
            </Link>

          </div>

          {children}

        </div>

      </body>
    </html>
  )
}
