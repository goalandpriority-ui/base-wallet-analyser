"use client"

import { useEffect, useState } from "react"

export default function Leaderboard() {

  const [data, setData] = useState<any[]>([])

  useEffect(() => {
    fetch("/api/leaderboard")
      .then(res => res.json())
      .then(setData)
  }, [])

  return (
    <main style={{ padding: 40, fontFamily: "sans-serif" }}>

      <h1>🏆 Leaderboard (24h)</h1>

      {data.map((w, i) => (
        <div key={i} style={{
          background:"#111",
          color:"#0f0",
          padding:15,
          marginBottom:10,
          borderRadius:8
        }}>
          #{i+1} — {w.wallet}
          <br/>
          Score: {w.score}
          <br/>
          Volume: ${Number(w.volume).toFixed(2)}
          <br/>
          Swaps: {w.swaps}
        </div>
      ))}

    </main>
  )
}
