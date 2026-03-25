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
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: { persistSession: false }
      }
    )

    const { error } = await supabase
      .from("paid_users")
      .upsert([
        {
          wallet: wallet.trim().toLowerCase(),
          paid: true
        }
      ])

    if (error) {
      console.log("SUPABASE INSERT ERROR:", error)
      return NextResponse.json({ ok: false })
    }

    return NextResponse.json({ ok: true })

  } catch (e) {
    console.log("MARK PAID FAIL:", e)
    return NextResponse.json({ ok: false })
  }
}
