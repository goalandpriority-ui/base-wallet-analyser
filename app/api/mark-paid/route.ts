export const dynamic = "force-dynamic"
export const runtime = "nodejs"

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function POST(req: NextRequest) {
  try {

    const { wallet } = await req.json()

    if (!wallet) {
      return NextResponse.json({ ok: false })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const address = wallet.toLowerCase()

    const { error } = await supabase
      .from("paid_users")
      .upsert({
        wallet: address
      })

    if (error) {
      console.error(error)
      return NextResponse.json({ ok: false })
    }

    return NextResponse.json({ ok: true })

  } catch (err) {
    console.error(err)
    return NextResponse.json({ ok: false })
  }
}
