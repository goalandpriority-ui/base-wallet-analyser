import { NextResponse } from "next/server"

export async function GET() {
  return new NextResponse(`<!DOCTYPE html>
<html>
<head>

<meta property="og:title" content="Base Wallet Analyser" />
<meta property="og:image" content="https://base-wallet-analyser.vercel.app/splash.png" />

<meta name="fc:frame" content="vNext" />
<meta name="fc:frame:image" content="https://base-wallet-analyser.vercel.app/splash.png" />
<meta name="fc:frame:button:1" content="Open App" />
<meta name="fc:frame:button:1:action" content="link" />
<meta name="fc:frame:button:1:target" content="https://base-wallet-analyser.vercel.app" />

</head>
<body>
Base Wallet Analyser
</body>
</html>`, {
    headers: {
      "Content-Type": "text/html"
    }
  })
}
