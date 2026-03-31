import Navbar from "./navbar";
import type { Metadata } from "next";

const miniappMetadata = {
  version: "1",
  imageUrl: "https://base-wallet-analyser.vercel.app/icon.png",
  button: {
    title: "🚀 Open Base Wallet Analyser",
    action: {
      type: "launch_miniapp",
      name: "Base Wallet Analyser",
      url: "https://base-wallet-analyser.vercel.app",
      splashImageUrl: "https://base-wallet-analyser.vercel.app/splash.png",
      splashBackgroundColor: "#020617"
    }
  }
};

export const metadata: Metadata = {
  title: "Base Wallet Analyser",
  description: "Analyse wallets on Base network",

  icons: {
    icon: "/favicon.png",
    shortcut: "/favicon.png",
    apple: "/icon.png"
  },

  openGraph: {
    title: "Base Wallet Analyser",
    description: "Analyse wallets on Base network",
    url: "https://base-wallet-analyser.vercel.app",
    siteName: "Base Wallet Analyser",
    images: [
      {
        url: "https://base-wallet-analyser.vercel.app/splash.png",
        width: 1200,
        height: 630,
      }
    ],
    type: "website",
  },

  twitter: {
    card: "summary_large_image",
    title: "Base Wallet Analyser",
    description: "Analyse wallets on Base network",
    images: ["https://base-wallet-analyser.vercel.app/splash.png"],
  },

  other: {
    "fc:miniapp": JSON.stringify(miniappMetadata),
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta name="fc:miniapp" content={JSON.stringify(miniappMetadata)} />
        <meta name="fc:frame" content={JSON.stringify(miniappMetadata)} />

        <link rel="manifest" href="/.well-known/farcaster.json" />

        <link rel="icon" href="/favicon.png" />
        <link rel="apple-touch-icon" href="/icon.png" />

        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body>
        <Navbar />
        {children}
      </body>
    </html>
  );
}
