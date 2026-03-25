export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from "next/server"
import { getSupabase } from "@/lib/supabase"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const wallet = body.wallet

    if (!wallet) {
      return NextResponse.json({ ok:false })
    }

    const supabase = getSupabase()

    const { data, error } = await supabase
      .from("paid_users")
      .upsert([
        {
          wallet: wallet.toLowerCase()
        }
      ])
      .select()

    if (error) {
      console.log("SUPABASE ERROR:", error)
      return NextResponse.json({ ok:false })
    }

    return NextResponse.json({
      ok:true,
      data
    })

  } catch (e:any) {
    console.log("MARK PAID CRASH:", e)
    return NextResponse.json({
      ok:false
    })
  }
}
