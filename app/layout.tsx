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
      <body
        style={{
          margin: 0,
          background: "#f5f5f5",
          fontFamily: "system-ui, -apple-system, sans-serif"
        }}
      >
        {children}
      </body>
    </html>
  )
}
