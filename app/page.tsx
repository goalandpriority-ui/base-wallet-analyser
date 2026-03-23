"use client"

import { useState } from "react"
import Link from "next/link"

export default function Home() {
  const [wallet, setWallet] = useState("")
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [menu, setMenu] = useState(false)

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

        {/* MENU BUTTON */}
        <div style={{ position:"relative" }}>
          <button
            onClick={() => setMenu(!menu)}
            style={{
              background:"#0b0b0b",
              color:"#00ff9c",
              border:"1px solid #222",
              padding:"8px 14px",
              borderRadius:8,
              fontSize:16,
              cursor:"pointer"
            }}
          >
            ☰
          </button>

          {/* DROPDOWN */}
          {menu && (
            <div style={{
              position:"absolute",
              right:0,
              top:45,
              background:"#0b0b0b",
              border:"1px solid #222",
              borderRadius:10,
              width:220,
              overflow:"hidden",
              boxShadow:"0 10px 30px rgba(0,0,0,0.5)"
            }}>

              <Link href="/leaderboard">
                <div style={menuItem}>🏆 Leaderboard</div>
              </Link>

              <Link href="/top-wallets">
                <div style={menuItem}>👑 Top Wallets</div>
              </Link>

              <Link href="/top-traders">
                <div style={menuItem}>📈 Top Traders</div>
              </Link>

              <Link href="/highest-volume">
                <div style={menuItem}>💰 Highest Volume</div>
              </Link>

              {/* NEW CREATOR PAGE */}
              <Link href="/creator">
                <div style={menuItemNoBorder}>👤 Creator Profile</div>
              </Link>

            </div>
          )}
        </div>

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

const menuItem = {
  padding:"12px",
  borderBottom:"1px solid #1a1a1a",
  cursor:"pointer",
  color:"#00ff9c"
}

const menuItemNoBorder = {
  padding:"12px",
  cursor:"pointer",
  color:"#00ff9c"
}

const divider = {
  margin:"15px 0",
  borderColor:"#222"
}
