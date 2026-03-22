import { NextRequest, NextResponse } from "next/server"
import { getSupabase } from "@/lib/supabase"

export async function GET(req:NextRequest){

const supabase = getSupabase()

const { searchParams } = new URL(req.url)

const page = Number(searchParams.get("page") || 1)
const wallet = searchParams.get("wallet")

const limit = 1000
const offset = (page-1)*limit

const { data } = await supabase
.from("leaderboard")
.select("*")
.order("swaps",{ascending:false})
.range(offset, offset+limit-1)

let yourRank = null

if(wallet){

const { data: all } = await supabase
.from("leaderboard")
.select("wallet")
.order("swaps",{ascending:false})

yourRank =
all?.findIndex(w=>w.wallet===wallet)+1

}

return NextResponse.json({
data,
yourRank
})

}
