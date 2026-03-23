import { NextResponse } from "next/server"
import { getSupabase } from "@/lib/supabase"

export async function POST(req:Request){

const { wallet } = await req.json()

if(!wallet){
return NextResponse.json({ok:false})
}

const supabase = getSupabase()

await supabase
.from("paid_users")
.upsert({
wallet: wallet.toLowerCase(),
paid: true
})

return NextResponse.json({ok:true})

}
