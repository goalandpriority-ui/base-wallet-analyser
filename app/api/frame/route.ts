import { NextResponse } from "next/server"

export async function GET() {

const embed = {
version:"1",
imageUrl:"https://base-wallet-analyser.vercel.app/splash.png",
button:{
title:"Open Base Wallet Analyser",
action:{
type:"launch_miniapp",
url:"https://base-wallet-analyser.vercel.app",
splashImageUrl:"https://base-wallet-analyser.vercel.app/splash.png",
splashBackgroundColor:"#020617"
}
}
}

const html = `
<!DOCTYPE html>
<html>
<head>

<meta name="fc:miniapp" content='${JSON.stringify(embed)}' />

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
