import { NextResponse } from "next/server"

export async function GET() {

const html = `
<!DOCTYPE html>
<html>
<head>

<meta property="fc:frame" content="vNext" />
<meta property="fc:frame:image" content="https://base-wallet-analyser.vercel.app/splash.png" />
<meta property="fc:frame:button:1" content="Open Base Wallet Analyser" />
<meta property="fc:frame:button:1:action" content="link" />
<meta property="fc:frame:button:1:target" content="https://base-wallet-analyser.vercel.app" />

<meta property="og:title" content="Base Wallet Analyser" />
<meta property="og:image" content="https://base-wallet-analyser.vercel.app/splash.png" />

</head>
<body>
Base Wallet Analyser
</body>
</html>
`

return new NextResponse(html,{
headers:{
"Content-Type":"text/html"
}
})

}
