import { NextRequest, NextResponse } from "next/server"
import { getSupabase } from "@/lib/supabase"

export async function GET(req:NextRequest){

const supabase=getSupabase()

const { searchParams } = new URL(req.url)

const page=Number(searchParams.get("page")||1)
const wallet=searchParams.get("wallet")

const limit=1000
const from=(page-1)*limit
const to=from+limit-1

const { data } = await supabase
.from("leaderboard")
.select("*")
.order("swapCount",{ascending:false})
.range(from,to)

let yourRank=null

if(wallet){

const { data:all } = await supabase
.from("leaderboard")
.select("wallet,swapCount")
.order("swapCount",{ascending:false})

const i = all?.findIndex(
w=>w.wallet.toLowerCase()===wallet.toLowerCase()
)

if(i!==-1) yourRank=i+1

}

return NextResponse.json({
data,
yourRank
})

}
