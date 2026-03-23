"use client"

import { useState } from "react"

export default function Home() {
  const [wallet, setWallet] = useState("")
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const analyse = async () => {
    setLoading(true)
    setData(null)

    try {

      // ✅ SAVE LAST WALLET FOR LEADERBOARD PAGES
      localStorage.setItem("lastWallet", wallet)

      const [basicRes, proRes] = await Promise.all([
        fetch("/api/analyse", {
          method: "POST",
          body: JSON.stringify({ wallet }),
        }),
        fetch("/api/analyse-pro", {
          method: "POST",
          body: JSON.stringify({ wallet }),
        }),
      ])

      const basicData = await basicRes.json()
      const proData = await proRes.json()

      setData({
        ...basicData,
        ...proData,
      })
    } catch (err) {
      alert("Error analysing wallet")
    }

    setLoading(false)
  }

  return (
    <main style={{
      padding:20,
      fontFamily:"system-ui",
      maxWidth:700,
      margin:"auto"
    }}>

      {/* HEADER */}
      <div style={{
        display:"flex",
        justifyContent:"space-between",
        alignItems:"center",
        marginBottom:25
      }}>

        <h1 style={{
          fontSize:28,
          fontWeight:700
        }}>
          🔥 Base Wallet Analyser (PRO)
        </h1>

      </div>

      {/* INPUT */}
      <input
        placeholder="Enter wallet address"
        value={wallet}
        onChange={(e) => setWallet(e.target.value)}
        style={{
          padding:12,
          width:"100%",
          borderRadius:8,
          border:"1px solid #ccc",
          fontSize:14
        }}
      />

      <br /><br />

      <button
        onClick={analyse}
        style={{
          padding:"10px 20px",
          borderRadius:8,
          border:"1px solid #ccc",
          background:"#fff",
          cursor:"pointer"
        }}
      >
        {loading ? "Analysing..." : "Analyse"}
      </button>

      <br /><br />

      {data && !data.error && (
        <div style={{
          background:"#0b0b0b",
          color:"#00ff9c",
          padding:20,
          borderRadius:14,
          marginTop:10
        }}>

          <p>📊 Transactions: {data.totalTxns || 0}</p>
          <p>💰 Transfer Volume: {data.totalVolumeETH || 0} ETH</p>
          <p>⛽ Gas: {data.totalGasETH || 0} ETH</p>
          <p>📅 Active Days: {data.activeDays || 0}</p>

          <hr style={divider} />

          <p>🔁 Swaps: {data.swapCount || 0}</p>

          <p>
            💎 Trading Volume: $
            {data.tradingVolumeUSD ?? 0}
          </p>

          <p>📅 Trading Days: {data.tradingDays || 0}</p>
          <p>⛽ Trading Gas: {data.tradingGasETH || 0} ETH</p>

          <hr style={divider} />

          <p>🏆 Rank: #{data.rank || "-"}</p>
          <p>⭐ Score: {data.score || 0}</p>

        </div>
      )}

      {data?.error && (
        <p style={{ color:"red" }}>
          {data.error}
        </p>
      )}

    </main>
  )
}

const divider = {
  margin:"15px 0",
  borderColor:"#222"
}
