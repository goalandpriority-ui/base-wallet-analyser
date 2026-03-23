import { NextResponse } from "next/server"
import { getSupabase } from "@/lib/supabase"

export async function GET(req:Request){

const { searchParams } = new URL(req.url)

const wallet = searchParams.get("wallet")

if(!wallet){
return NextResponse.json({paid:false})
}

const supabase = getSupabase()

const { data } = await supabase
.from("paid_users")
.select("*")
.eq("wallet",wallet.toLowerCase())
.single()

return NextResponse.json({
paid: !!data
})

}
