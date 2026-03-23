import { NextRequest, NextResponse } from "next/server"
import { getSupabase } from "@/lib/supabase"

export async function GET(req:NextRequest){

const supabase = getSupabase()

const { searchParams } = new URL(req.url)
const wallet = searchParams.get("wallet")

if(!wallet) return NextResponse.json([])

const { data: follows } = await supabase
.from("follows")
.select("followed")
.eq("wallet",wallet)

if(!follows || follows.length===0)
return NextResponse.json([])

const wallets = follows.map(f=>f.followed)

const { data } = await supabase
.from("leaderboard")
.select("*")
.in("wallet",wallets)
.order("score",{ascending:false})
.limit(20)

return NextResponse.json(data || [])

}
