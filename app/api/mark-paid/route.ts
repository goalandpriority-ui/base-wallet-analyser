export const dynamic = "force-dynamic"
export const runtime = "nodejs"

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function POST(req: NextRequest) {
  try {

    const body = await req.json()
    const wallet = body.wallet

    if (!wallet) {
      return NextResponse.json({ ok:false, error:"no wallet" })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL as string,
      process.env.SUPABASE_SERVICE_ROLE_KEY as string
    )

    const { error } = await supabase
      .from("paid_users")
      .upsert({
        wallet: wallet.toLowerCase()
      })

    if (error) {
      console.log("SUPABASE ERROR:", error)
      return NextResponse.json({ ok:false, error })
    }

    return NextResponse.json({ ok:true })

  } catch (e:any) {
    console.log("SERVER ERROR:", e)
    return NextResponse.json({ ok:false, error:e?.message })
  }
}
