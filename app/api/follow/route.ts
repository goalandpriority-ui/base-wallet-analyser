import { NextRequest, NextResponse } from "next/server"
import { getSupabase } from "@/lib/supabase"

export async function POST(req:NextRequest){

const supabase = getSupabase()

const { wallet, followed } = await req.json()

await supabase
.from("follows")
.insert({
wallet,
followed
})

return NextResponse.json({ok:true})

}

export async function GET(req:NextRequest){

const supabase = getSupabase()

const { searchParams } = new URL(req.url)

const wallet = searchParams.get("wallet")

const { data } = await supabase
.from("follows")
.select("*")
.eq("wallet",wallet)

return NextResponse.json(data || [])

}
