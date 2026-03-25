import { NextRequest, NextResponse } from "next/server"
import { getSupabase } from "@/lib/supabase"

export async function POST(req: NextRequest) {
  try {
    const { wallet } = await req.json()

    if (!wallet) {
      return NextResponse.json({ ok: false })
    }

    const supabase = getSupabase()

    const { error } = await supabase
      .from("paid_users")
      .upsert([
        {
          wallet: wallet.trim().toLowerCase(),
          paid: true
        }
      ])

    if (error) {
      console.error("MARK PAID ERROR:", error)
      return NextResponse.json({ ok: false })
    }

    return NextResponse.json({ ok: true })

  } catch (e) {
    console.error("MARK PAID CRASH:", e)
    return NextResponse.json({ ok: false })
  }
}
