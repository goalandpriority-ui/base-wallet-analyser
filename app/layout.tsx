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
      <body>{children}</body>
    </html>
  )
}
