export async function POST(req: Request) {
  return Response.json({
    type: "frame",
    frameUrl: "https://base-wallet-analyser.vercel.app"
  })
}

export async function GET() {
  return Response.json({
    ok: true
  })
}
