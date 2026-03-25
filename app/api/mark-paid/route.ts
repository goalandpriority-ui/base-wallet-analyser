export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from "next/server"
import { getSupabase } from "@/lib/supabase"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const wallet = body.wallet
    const txHash = body.txHash

    if (!wallet) {
      return NextResponse.json({ ok:false, error:"no wallet" })
    }

    const supabase = getSupabase()

    const { data, error } = await supabase
      .from("paid_users")
      .upsert([
        {
          wallet: wallet.toLowerCase(),
          tx_hash: txHash || null,
          paid: true
        }
      ])
      .select()

    if (error) {
      console.log("SUPABASE ERROR:", error)
      return NextResponse.json({
        ok:false,
        error:error.message
      })
    }

    return NextResponse.json({
      ok:true,
      data
    })

  } catch (e:any) {
    console.log("MARK PAID CRASH:", e)
    return NextResponse.json({
      ok:false,
      error:e.message
    })
  }
}
