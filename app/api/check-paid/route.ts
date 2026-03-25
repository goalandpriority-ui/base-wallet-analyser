export const dynamic = "force-dynamic"
export const runtime = "nodejs"

import { NextResponse } from "next/server"
import { getSupabase } from "@/lib/supabase"

export async function GET(req: Request) {
  try {

    const { searchParams } = new URL(req.url)
    const wallet = searchParams.get("wallet")

    if (!wallet) {
      return NextResponse.json({ paid: false })
    }

    const address = wallet.trim().toLowerCase()

    const supabase = getSupabase()

    const { data, error } = await supabase
      .from("paid_users")
      .select("wallet")
      .eq("wallet", address)
      .maybeSingle()

    if (error) {
      console.error("check-paid error", error)
      return NextResponse.json({ paid: false })
    }

    return NextResponse.json({
      paid: !!data
    })

  } catch (err) {
    console.error(err)
    return NextResponse.json({ paid: false })
  }
}
