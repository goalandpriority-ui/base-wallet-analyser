import { NextResponse } from "next/server"
import { getSupabase } from "@/lib/supabase"

export async function GET(){

const supabase = getSupabase()

const { data } = await supabase
.from("follows")
.select("followed")

const map:any = {}

data?.forEach((r:any)=>{
map[r.followed] = (map[r.followed] || 0) + 1
})

const wallets = Object.entries(map)
.map(([wallet,followers])=>({
wallet,
followers
}))
.sort((a:any,b:any)=>b.followers-a.followers)
.slice(0,100)

const { data:paid } = await supabase
.from("paid")
.select("wallet")

const paidSet = new Set(
paid?.map((p:any)=>p.wallet)
)

const result = wallets.map((w:any)=>({
...w,
paid: paidSet.has(w.wallet)
}))

return NextResponse.json(result)

}
