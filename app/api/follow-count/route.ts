export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import { getSupabase } from "@/lib/supabase"

export async function GET(req:Request){

const { searchParams } = new URL(req.url)
const wallet = searchParams.get("wallet")

if(!wallet){
return NextResponse.json({
followers:0,
following:0
})
}

const supabase = getSupabase()

const { count:followers } = await supabase
.from("follows")
.select("*",{ count:"exact", head:true })
.eq("followed",wallet)

const { count:following } = await supabase
.from("follows")
.select("*",{ count:"exact", head:true })
.eq("wallet",wallet)

return NextResponse.json({
followers: followers || 0,
following: following || 0
})

}
