import { NextResponse } from "next/server"
import { getSupabase } from "../../../lib/supabase"

export async function GET(){

const supabase = getSupabase()

const { data } = await supabase
.from("leaderboard")
.select("*")

let wallets = data.length
let swaps = 0
let volume = 0

for(const w of data){
swaps += w.swaps || 0
volume += w.volume || 0
}

const trending = [...data]
.sort((a,b)=>b.swaps-a.swaps)
.slice(0,5)

return NextResponse.json({
wallets,
swaps,
volume,
trending
})

}
