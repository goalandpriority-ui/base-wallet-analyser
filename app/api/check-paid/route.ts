import { NextRequest, NextResponse } from "next/server"
import { getSupabase } from "@/lib/supabase"

export async function GET(req: NextRequest) {
  return handle(req)
}

export async function POST(req: NextRequest) {
  return handle(req)
}

async function handle(req: NextRequest) {
  try {
    let wallet: string | null = null

    // GET
    if (req.method === "GET") {
      const { searchParams } = new URL(req.url)
      wallet = searchParams.get("wallet")
    }

    // POST
    if (req.method === "POST") {
      const body = await req.json()
      wallet = body.wallet
    }

    if (!wallet) {
      return NextResponse.json({ paid: false })
    }

    const address = wallet.trim().toLowerCase()
    const supabase = getSupabase()

    const { data } = await supabase
      .from("paid_users")
      .select("wallet")
      .eq("wallet", address)
      .maybeSingle()

    return NextResponse.json({
      paid: !!data
    })

  } catch {
    return NextResponse.json({ paid: false })
  }
}
