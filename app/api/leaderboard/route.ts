import { NextRequest, NextResponse } from "next/server"
import { getSupabase } from "@/lib/supabase"

export async function GET(req:NextRequest){

const supabase = getSupabase()

const { searchParams } = new URL(req.url)

const page = Number(searchParams.get("page") || 1)
const wallet = searchParams.get("wallet")

const limit = 1000
const from = (page-1) * limit
const to = from + limit - 1

/* leaderboard page */

const { data } = await supabase
.from("leaderboard")
.select("*")
.order("score",{ascending:false})
.range(from,to)

/* rank */

let yourRank = null

if(wallet){

const { data:all } = await supabase
.from("leaderboard")
.select("wallet,score")
.order("score",{ascending:false})

const index = all?.findIndex(
w=>w.wallet.toLowerCase() === wallet.toLowerCase()
)

if(index !== -1) yourRank = index + 1

}

return NextResponse.json({
data,
yourRank
})

}
