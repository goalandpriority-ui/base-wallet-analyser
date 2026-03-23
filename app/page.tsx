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
        background:"linear-gradient(135deg,#020617,#020617,#001a1a)",
        padding:24,
        borderRadius:18,
        marginBottom:25,
        border:"1px solid rgba(34,197,94,0.2)",
        boxShadow:"0 0 60px rgba(34,197,94,0.08)",
        position:"relative",
        overflow:"hidden"
      }}>

        {/* glow */}
        <div style={{
          position:"absolute",
          width:200,
          height:200,
          background:"radial-gradient(circle,#22c55e33,transparent)",
          top:-60,
          right:-60,
          filter:"blur(40px)"
        }}/>

        <div style={{
          display:"flex",
          alignItems:"center",
          gap:14
        }}>

          {/* icon */}
          <div style={{
            fontSize:34,
            background:"linear-gradient(135deg,#60a5fa,#34d399)",
            WebkitBackgroundClip:"text",
            WebkitTextFillColor:"transparent"
          }}>
            ⚡
          </div>

          <div>

            {/* animated gradient title */}
            <h1 style={{
              fontSize:28,
              fontWeight:700,
              margin:0,
              background:"linear-gradient(90deg,#60a5fa,#34d399,#60a5fa)",
              backgroundSize:"200% 100%",
              WebkitBackgroundClip:"text",
              WebkitTextFillColor:"transparent",
              animation:"shine 6s linear infinite"
            }}>
              Base Wallet Analyser
            </h1>

            {/* subtitle */}
            <div style={{
              fontSize:13,
              color:"#9ca3af",
              marginTop:4
            }}>
              Analyse wallets on Base network
            </div>

          </div>
        </div>

      </div>

      {/* INPUT */}
      <input
        placeholder="Enter wallet address"
        value={wallet}
        onChange={(e) => setWallet(e.target.value)}
        style={{
          padding:14,
          width:"100%",
          borderRadius:12,
          border:"1px solid #1f2937",
          fontSize:14,
          background:"#020617",
          color:"#00ff9c",
          boxShadow:"0 0 20px rgba(34,197,94,0.05)"
        }}
      />

      <br /><br />

      <button
        onClick={analyse}
        style={{
          padding:"12px 24px",
          borderRadius:10,
          border:"1px solid #22c55e",
          background:"linear-gradient(90deg,#16a34a,#22c55e)",
          color:"#022c22",
          fontWeight:600,
          cursor:"pointer",
          boxShadow:"0 0 20px rgba(34,197,94,0.25)"
        }}
      >
        {loading ? "Analysing..." : "Analyse"}
      </button>

      <br /><br />

      {data && !data.error && (
        <div style={{
          background:"rgba(2,6,23,0.8)",
          backdropFilter:"blur(10px)",
          color:"#00ff9c",
          padding:20,
          borderRadius:14,
          marginTop:10,
          border:"1px solid rgba(34,197,94,0.15)",
          boxShadow:"0 0 30px rgba(34,197,94,0.05)"
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

      <style jsx global>{`
        @keyframes shine {
          0% { background-position: 0% }
          100% { background-position: 200% }
        }
      `}</style>

    </main>
  )
}

const divider = {
  margin:"15px 0",
  borderColor:"#0f172a"
}
