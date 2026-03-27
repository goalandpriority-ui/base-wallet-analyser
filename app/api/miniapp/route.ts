export const dynamic = "force-dynamic"

export async function GET() {
return new Response(`<!DOCTYPE html>
<html>
<head>

<meta property="og:title" content="Base Wallet Analyser" />
<meta property="og:description" content="Analyse wallets on Base network" />
<meta property="og:image" content="https://base-wallet-analyser.vercel.app/splash.png" />

<meta name="fc:miniapp" content='{
"version":"1",
"imageUrl":"https://base-wallet-analyser.vercel.app/splash.png",
"button":{
"title":"Open Base Wallet Analyser",
"action":{
"type":"launch_miniapp",
"url":"https://base-wallet-analyser.vercel.app",
"splashImageUrl":"https://base-wallet-analyser.vercel.app/splash.png",
"splashBackgroundColor":"#020617"
}
}
}'/>

</head>
<body>
Base Wallet Analyser
</body>
</html>`,{
headers:{
"Content-Type":"text/html"
}
})
}
