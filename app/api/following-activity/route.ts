import { NextRequest, NextResponse } from "next/server"
import { getSupabase } from "@/lib/supabase"

export async function POST(req:NextRequest){

const supabase = getSupabase()

const { wallet, followed } = await req.json()

if(!wallet || !followed)
return NextResponse.json({ok:false})

/* check exists */
const { data: exists } = await supabase
.from("follows")
.select("*")
.eq("wallet",wallet)
.eq("followed",followed)
.single()

if(exists){
return NextResponse.json({ok:true})
}

/* insert */
await supabase
.from("follows")
.insert({
wallet,
followed
})

return NextResponse.json({ok:true})

}
